
ALTER TABLE public.petani
  ADD COLUMN IF NOT EXISTS koordinat_lat numeric,
  ADD COLUMN IF NOT EXISTS koordinat_lng numeric,
  ADD COLUMN IF NOT EXISTS alamat_rumah text;

ALTER TABLE public.petani DROP CONSTRAINT IF EXISTS petani_koordinat_lat_range;
ALTER TABLE public.petani DROP CONSTRAINT IF EXISTS petani_koordinat_lng_range;
ALTER TABLE public.petani
  ADD CONSTRAINT petani_koordinat_lat_range CHECK (koordinat_lat IS NULL OR (koordinat_lat >= -90 AND koordinat_lat <= 90)),
  ADD CONSTRAINT petani_koordinat_lng_range CHECK (koordinat_lng IS NULL OR (koordinat_lng >= -180 AND koordinat_lng <= 180));

-- Normalize existing prefixes then enforce uppercase/alphanumeric with no spaces
UPDATE public.village_prefixes
SET code = UPPER(REGEXP_REPLACE(code, '[^A-Za-z0-9]', '', 'g'))
WHERE code <> UPPER(REGEXP_REPLACE(code, '[^A-Za-z0-9]', '', 'g'));

ALTER TABLE public.village_prefixes DROP CONSTRAINT IF EXISTS village_prefixes_code_format;
ALTER TABLE public.village_prefixes
  ADD CONSTRAINT village_prefixes_code_format
  CHECK (code ~ '^[A-Z0-9]{1,10}$');
