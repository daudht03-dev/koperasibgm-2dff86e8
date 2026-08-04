
CREATE POLICY "foto_lahan_read_roles" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'foto-lahan' AND public.has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang','pengawas','auditor']::app_role[])
);

CREATE POLICY "foto_lahan_insert_roles" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'foto-lahan' AND public.has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[])
);

CREATE POLICY "foto_lahan_update_roles" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'foto-lahan' AND public.has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[])
);

CREATE POLICY "foto_lahan_delete_roles" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'foto-lahan' AND public.has_any_role(auth.uid(), ARRAY['developer','admin','staf_lapang']::app_role[])
);
