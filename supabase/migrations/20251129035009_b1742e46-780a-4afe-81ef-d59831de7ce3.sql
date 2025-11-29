-- Add production_url field to profil_perusahaan table
ALTER TABLE profil_perusahaan 
ADD COLUMN production_url text;

COMMENT ON COLUMN profil_perusahaan.production_url IS 'URL production untuk QR code (e.g., https://yourdomain.com)';