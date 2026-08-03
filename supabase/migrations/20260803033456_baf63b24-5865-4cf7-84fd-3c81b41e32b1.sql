-- Promote current account to developer
INSERT INTO public.user_roles (user_id, role)
VALUES ('94024c29-6ded-44eb-a136-da9af89ead12', 'developer')
ON CONFLICT (user_id, role) DO NOTHING;

-- Helper: any of the given roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_any_role(uuid, app_role[]) FROM anon;

-- Route history
CREATE TABLE public.auditor_route_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  origin_label text,
  origin_lat numeric,
  origin_lng numeric,
  dest_label text,
  dest_code text,
  dest_lat numeric,
  dest_lng numeric,
  travel_mode text,
  distance_meters numeric,
  duration_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.auditor_route_history TO authenticated;
GRANT ALL ON public.auditor_route_history TO service_role;
ALTER TABLE public.auditor_route_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own route history"
ON public.auditor_route_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own route history"
ON public.auditor_route_history FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_any_role(auth.uid(), ARRAY['developer','admin']::app_role[]));

-- Field photos
CREATE TABLE public.foto_lahan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petani_id uuid REFERENCES public.petani(id) ON DELETE SET NULL,
  lahan_id uuid REFERENCES public.lahan(id) ON DELETE SET NULL,
  tipe text NOT NULL DEFAULT 'lahan',
  nama_petani text,
  kode text,
  judul text,
  alamat text,
  koordinat_lat numeric,
  koordinat_lng numeric,
  plus_code text,
  catatan text,
  file_path text NOT NULL,
  file_url text NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.foto_lahan TO authenticated;
GRANT ALL ON public.foto_lahan TO service_role;
ALTER TABLE public.foto_lahan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal roles can read photos"
ON public.foto_lahan FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['developer','admin','pengawas','staf_lapang','auditor']::app_role[]));

CREATE POLICY "Field staff can insert photos"
ON public.foto_lahan FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[]));

CREATE POLICY "Field staff can update photos"
ON public.foto_lahan FOR UPDATE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[]))
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[]));

CREATE POLICY "Field staff can delete photos"
ON public.foto_lahan FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[]));

CREATE TRIGGER update_foto_lahan_updated_at
BEFORE UPDATE ON public.foto_lahan
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_foto_lahan_petani ON public.foto_lahan(petani_id);
CREATE INDEX idx_foto_lahan_lahan ON public.foto_lahan(lahan_id);
CREATE INDEX idx_route_history_user ON public.auditor_route_history(user_id, created_at DESC);