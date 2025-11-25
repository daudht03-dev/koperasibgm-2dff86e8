-- Add logo_url to petani table for individual farmer logos
ALTER TABLE public.petani 
ADD COLUMN logo_url text;

-- Add custom_fields configuration to profil_perusahaan
-- This will store the custom field definitions that admin can configure
ALTER TABLE public.profil_perusahaan
ADD COLUMN custom_fields jsonb DEFAULT '[]'::jsonb;

-- Add custom_data to petani table to store custom field values per farmer
ALTER TABLE public.petani
ADD COLUMN custom_data jsonb DEFAULT '{}'::jsonb;

-- Create storage bucket for farmer logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('farmer-logos', 'farmer-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for farmer logos
CREATE POLICY "Admins can upload farmer logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'farmer-logos' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can update farmer logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'farmer-logos' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Admins can delete farmer logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'farmer-logos' AND
  (SELECT has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Public can view farmer logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'farmer-logos');