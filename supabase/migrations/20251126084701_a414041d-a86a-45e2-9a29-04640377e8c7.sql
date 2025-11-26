-- Update identity_label_settings to include size configurations for each template
COMMENT ON COLUMN public.profil_perusahaan.identity_label_settings IS 'Customization settings for identity label including text labels, visibility options, and size configurations for each template style';

-- Note: The identity_label_settings JSONB column will now store size configurations like:
-- {
--   "show_company_logo": true,
--   "show_farmer_logo": false,
--   "header_text": "Member of",
--   "farmer_name_label": "Farmer Name",
--   "farmer_code_label": "Farmer Code",
--   "qr_text": "Scan untuk verifikasi identitas",
--   "card_style": "modern",
--   "sizes": {
--     "modern": { "width": 350, "height": 500, "unit": "px" },
--     "badge": { "width": 400, "height": 280, "unit": "px" },
--     "sticker": { "width": 320, "height": 320, "unit": "px" }
--   }
-- }