ALTER TABLE public.foto_lahan_riwayat ADD COLUMN IF NOT EXISTS changed_by_email text;

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
  v_email text;
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

  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.foto_lahan_riwayat (foto_id, versi, aksi, snapshot, perubahan, changed_by, changed_by_email)
  VALUES (COALESCE(NEW.id, OLD.id), v_next, v_action, v_snapshot, v_diff, auth.uid(), v_email);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_foto_lahan_versi() FROM PUBLIC, anon, authenticated;