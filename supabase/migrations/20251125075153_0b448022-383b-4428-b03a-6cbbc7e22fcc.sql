-- Add template customization fields to company profile
ALTER TABLE profil_perusahaan
ADD COLUMN template_settings JSONB DEFAULT '{
  "show_logo": true,
  "show_company_name": true,
  "show_weight": true,
  "show_farmer_name": true,
  "show_certifications": true,
  "show_qr": true,
  "show_status_badge": true,
  "logo_size": "medium",
  "qr_position": "center",
  "certification_layout": "horizontal",
  "element_order": ["logo", "company", "weight", "farmer", "certifications", "qr", "badge"]
}'::jsonb;