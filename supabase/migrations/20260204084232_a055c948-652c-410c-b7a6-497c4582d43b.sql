-- Add rata_rata_panen and regulasi columns to petani table
ALTER TABLE public.petani 
ADD COLUMN IF NOT EXISTS rata_rata_panen numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS regulasi text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.petani.rata_rata_panen IS 'Average daily harvest in kg';
COMMENT ON COLUMN public.petani.regulasi IS 'Regulation type: EU, COR, or EU,COR';