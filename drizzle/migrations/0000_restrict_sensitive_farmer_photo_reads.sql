-- foto_lahan.tipe is unconstrained text and already accepts ktp/pelatihan.
-- All nine optional location/accuracy/title columns are already nullable.
CREATE POLICY "Restrict KTP photo reads"
ON public.foto_lahan
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  tipe IS DISTINCT FROM 'ktp'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR public.has_role(auth.uid(), 'staf_lapang'::public.app_role)
  OR public.has_role(auth.uid(), 'pengawas'::public.app_role)
  OR public.has_role(auth.uid(), 'auditor'::public.app_role)
);

CREATE POLICY "Restrict KTP storage reads"
ON storage.objects
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  bucket_id IS DISTINCT FROM 'foto-lahan'
  OR name NOT LIKE 'ktp/%'
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'developer'::public.app_role)
  OR public.has_role(auth.uid(), 'staf_lapang'::public.app_role)
  OR public.has_role(auth.uid(), 'pengawas'::public.app_role)
  OR public.has_role(auth.uid(), 'auditor'::public.app_role)
);