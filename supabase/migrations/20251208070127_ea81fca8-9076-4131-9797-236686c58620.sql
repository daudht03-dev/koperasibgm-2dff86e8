-- Add detail_petani column to batch_panen to store farmer details for pengovenan
ALTER TABLE public.batch_panen 
ADD COLUMN IF NOT EXISTS detail_petani JSONB DEFAULT NULL;

COMMENT ON COLUMN public.batch_panen.detail_petani IS 'JSON array storing petani details from pengambilan_koperasi for traceability';