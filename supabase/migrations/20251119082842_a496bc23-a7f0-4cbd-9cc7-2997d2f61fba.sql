-- Drop foreign key constraint if exists and alter lahan table structure
-- Remove old columns and add new simplified structure

-- Add new columns first
ALTER TABLE public.lahan 
ADD COLUMN IF NOT EXISTS kode_lahan text,
ADD COLUMN IF NOT EXISTS keterangan text;

-- Update existing records with default values to prevent data loss
UPDATE public.lahan 
SET kode_lahan = COALESCE(kode_lahan, 'LAHAN-' || substring(id::text, 1, 8)),
    keterangan = COALESCE(keterangan, 'Lahan seluas ' || luas::text || ' ha di ' || alamat);

-- Make kode_lahan NOT NULL and unique after setting default values
ALTER TABLE public.lahan 
ALTER COLUMN kode_lahan SET NOT NULL,
ADD CONSTRAINT lahan_kode_lahan_unique UNIQUE (kode_lahan);

-- Drop old columns
ALTER TABLE public.lahan 
DROP COLUMN IF EXISTS petani_id,
DROP COLUMN IF EXISTS luas,
DROP COLUMN IF EXISTS alamat,
DROP COLUMN IF EXISTS koordinat,
DROP COLUMN IF EXISTS jumlah_tanaman;