-- Add label template selection to company profile
ALTER TABLE profil_perusahaan
ADD COLUMN label_template TEXT DEFAULT 'template_a' CHECK (label_template IN ('template_a', 'template_b', 'template_c'));