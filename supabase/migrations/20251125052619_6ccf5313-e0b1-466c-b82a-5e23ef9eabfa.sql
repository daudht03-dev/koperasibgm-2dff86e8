-- Remove berat_kg column from label_settings table
ALTER TABLE public.label_settings 
DROP COLUMN IF EXISTS berat_kg;