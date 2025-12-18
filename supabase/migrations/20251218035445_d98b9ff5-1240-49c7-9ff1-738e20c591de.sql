-- Add is_organic column to lahan table
ALTER TABLE public.lahan ADD COLUMN is_organic boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.lahan.is_organic IS 'Status organik/konvensional lahan, default mengikuti petani';