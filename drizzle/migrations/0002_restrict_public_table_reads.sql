DROP POLICY IF EXISTS "Everyone can view farmers" ON public.petani;
CREATE POLICY "Authorized roles can view farmers" ON public.petani AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','developer','staf_lapang','pengawas','auditor']::public.app_role[]));

DROP POLICY IF EXISTS "Everyone can view lands" ON public.lahan;
CREATE POLICY "Authorized roles can view lands" ON public.lahan AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','developer','staf_lapang','pengawas','auditor']::public.app_role[]));

DROP POLICY IF EXISTS "Everyone can view harvests" ON public.panen;
CREATE POLICY "Authorized roles can view harvests" ON public.panen AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','developer','staf_lapang','pengawas']::public.app_role[]));

DROP POLICY IF EXISTS "Everyone can view pengepul" ON public.pengepul;
CREATE POLICY "Authorized roles can view pengepul" ON public.pengepul AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','developer','staf_lapang','pengawas']::public.app_role[]));

DROP POLICY IF EXISTS "Everyone can view label settings" ON public.label_settings;
CREATE POLICY "Authorized roles can view label settings" ON public.label_settings AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','developer']::public.app_role[]));

DROP POLICY IF EXISTS "Anyone can view village prefixes" ON public.village_prefixes;
CREATE POLICY "Authorized roles can view village prefixes" ON public.village_prefixes AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_any_role(auth.uid(), ARRAY['admin','developer','staf_lapang','pengawas','auditor']::public.app_role[]));