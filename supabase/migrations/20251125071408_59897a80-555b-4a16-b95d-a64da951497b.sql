-- Add QR code customization columns to profil_perusahaan table
ALTER TABLE profil_perusahaan
ADD COLUMN qr_size INTEGER DEFAULT 200,
ADD COLUMN qr_error_correction TEXT DEFAULT 'M',
ADD COLUMN qr_logo_url TEXT,
ADD COLUMN qr_logo_size INTEGER DEFAULT 50;