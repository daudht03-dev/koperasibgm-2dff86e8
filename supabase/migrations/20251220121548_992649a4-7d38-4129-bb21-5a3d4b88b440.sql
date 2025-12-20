-- Create farmer-logos bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('farmer-logos', 'farmer-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create produk bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('produk', 'produk', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for farmer-logos bucket
CREATE POLICY "Public can view farmer logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'farmer-logos');

CREATE POLICY "Admins can upload farmer logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'farmer-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update farmer logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'farmer-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete farmer logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'farmer-logos' AND public.has_role(auth.uid(), 'admin'));

-- RLS policies for produk bucket
CREATE POLICY "Public can view produk images"
ON storage.objects FOR SELECT
USING (bucket_id = 'produk');

CREATE POLICY "Admins can upload produk images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'produk' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update produk images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'produk' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete produk images"
ON storage.objects FOR DELETE
USING (bucket_id = 'produk' AND public.has_role(auth.uid(), 'admin'));