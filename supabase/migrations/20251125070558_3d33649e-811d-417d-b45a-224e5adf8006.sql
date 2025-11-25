-- Add label customization columns to profil_perusahaan table
ALTER TABLE profil_perusahaan
ADD COLUMN label_primary_color TEXT DEFAULT '30 71% 42%',
ADD COLUMN label_background_start TEXT DEFAULT '40 100% 97%',
ADD COLUMN label_background_end TEXT DEFAULT '33 100% 87%',
ADD COLUMN label_font_family TEXT DEFAULT 'Playfair Display';