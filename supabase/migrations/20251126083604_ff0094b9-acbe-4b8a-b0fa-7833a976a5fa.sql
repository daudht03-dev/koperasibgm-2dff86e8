-- Add identity label customization fields to profil_perusahaan
ALTER TABLE public.profil_perusahaan
ADD COLUMN IF NOT EXISTS identity_label_primary_color text DEFAULT '30 71% 42%',
ADD COLUMN IF NOT EXISTS identity_label_font_family text DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS identity_label_settings jsonb DEFAULT '{
  "show_company_logo": true,
  "show_farmer_logo": false,
  "header_text": "Member of",
  "farmer_name_label": "Farmer Name",
  "farmer_code_label": "Farmer Code",
  "qr_text": "Scan untuk verifikasi identitas",
  "card_style": "modern"
}'::jsonb;

COMMENT ON COLUMN public.profil_perusahaan.identity_label_primary_color IS 'Primary color for identity label in HSL format';
COMMENT ON COLUMN public.profil_perusahaan.identity_label_font_family IS 'Font family for identity label';
COMMENT ON COLUMN public.profil_perusahaan.identity_label_settings IS 'Customization settings for identity label including text labels and visibility options';