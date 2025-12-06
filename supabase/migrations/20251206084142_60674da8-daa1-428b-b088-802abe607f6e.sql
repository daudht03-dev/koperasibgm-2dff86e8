-- Create missing storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('produk', 'produk', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('farmer-logos', 'farmer-logos', true);

-- RLS policies for 'produk' bucket
CREATE POLICY "Public can view produk images"
ON storage.objects FOR SELECT
USING (bucket_id = 'produk');

CREATE POLICY "Admins can upload produk images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'produk' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update produk images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'produk' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete produk images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'produk' AND has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for 'farmer-logos' bucket
CREATE POLICY "Public can view farmer logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'farmer-logos');

CREATE POLICY "Admins can upload farmer logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'farmer-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update farmer logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'farmer-logos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete farmer logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'farmer-logos' AND has_role(auth.uid(), 'admin'::app_role));