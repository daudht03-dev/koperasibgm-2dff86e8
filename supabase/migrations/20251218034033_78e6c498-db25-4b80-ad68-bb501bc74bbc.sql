-- Create storage bucket for company profile images
INSERT INTO storage.buckets (id, name, public) VALUES ('profil-perusahaan', 'profil-perusahaan', true);

-- Create policies for the bucket
CREATE POLICY "Anyone can view company profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profil-perusahaan');

CREATE POLICY "Admins can upload company profile images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profil-perusahaan' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update company profile images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profil-perusahaan' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete company profile images"
ON storage.objects FOR DELETE
USING (bucket_id = 'profil-perusahaan' AND has_role(auth.uid(), 'admin'));