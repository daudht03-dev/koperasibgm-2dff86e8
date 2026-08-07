-- 1. Extra columns on foto_lahan
ALTER TABLE public.foto_lahan
  ADD COLUMN IF NOT EXISTS akurasi_meter numeric,
  ADD COLUMN IF NOT EXISTS akurasi_skor integer,
  ADD COLUMN IF NOT EXISTS akurasi_catatan text,
  ADD COLUMN IF NOT EXISTS tampilkan_waktu boolean NOT NULL DEFAULT true;

-- 2. Version history / audit log
CREATE TABLE IF NOT EXISTS public.foto_lahan_riwayat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foto_id uuid NOT NULL,
  versi integer NOT NULL DEFAULT 1,
  aksi text NOT NULL,
  snapshot jsonb NOT NULL,
  perubahan jsonb,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_foto_lahan_riwayat_foto ON public.foto_lahan_riwayat (foto_id, changed_at DESC);

GRANT SELECT ON public.foto_lahan_riwayat TO authenticated;
GRANT ALL ON public.foto_lahan_riwayat TO service_role;

ALTER TABLE public.foto_lahan_riwayat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal roles can read photo history" ON public.foto_lahan_riwayat;
CREATE POLICY "Internal roles can read photo history"
ON public.foto_lahan_riwayat FOR SELECT TO authenticated
USING (has_any_role(auth.uid(), ARRAY['developer','admin','pengawas','staf_lapang','auditor']::app_role[]));

-- 3. Trigger that records each version
CREATE OR REPLACE FUNCTION public.log_foto_lahan_versi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
  v_diff jsonb := '{}'::jsonb;
  v_snapshot jsonb;
  v_action text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_snapshot := to_jsonb(OLD);
  ELSIF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_snapshot := to_jsonb(NEW);
  ELSE
    v_action := 'update';
    v_snapshot := to_jsonb(NEW);
    SELECT jsonb_object_agg(key, jsonb_build_object('dari', to_jsonb(OLD)->key, 'ke', to_jsonb(NEW)->key))
    INTO v_diff
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key
      AND key NOT IN ('updated_at');
    IF v_diff IS NULL OR v_diff = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT COALESCE(MAX(versi), 0) + 1 INTO v_next
  FROM public.foto_lahan_riwayat
  WHERE foto_id = COALESCE(NEW.id, OLD.id);

  INSERT INTO public.foto_lahan_riwayat (foto_id, versi, aksi, snapshot, perubahan, changed_by)
  VALUES (COALESCE(NEW.id, OLD.id), v_next, v_action, v_snapshot, v_diff, auth.uid());

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_foto_lahan_versi ON public.foto_lahan;
CREATE TRIGGER trg_foto_lahan_versi
AFTER INSERT OR UPDATE OR DELETE ON public.foto_lahan
FOR EACH ROW EXECUTE FUNCTION public.log_foto_lahan_versi();

-- 4. Field staff may create/update farmers & lands
DROP POLICY IF EXISTS "Field staff can insert farmers" ON public.petani;
CREATE POLICY "Field staff can insert farmers"
ON public.petani FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[]));

DROP POLICY IF EXISTS "Field staff can update farmers" ON public.petani;
CREATE POLICY "Field staff can update farmers"
ON public.petani FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[]));

DROP POLICY IF EXISTS "Field staff can insert lands" ON public.lahan;
CREATE POLICY "Field staff can insert lands"
ON public.lahan FOR INSERT TO authenticated
WITH CHECK (has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[]));

DROP POLICY IF EXISTS "Field staff can update lands" ON public.lahan;
CREATE POLICY "Field staff can update lands"
ON public.lahan FOR UPDATE TO authenticated
USING (has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[]))
WITH CHECK (has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[]));