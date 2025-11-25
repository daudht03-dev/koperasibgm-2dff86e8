-- Drop existing view
DROP VIEW IF EXISTS public.petani_public;

-- Recreate view with alamat field included
CREATE VIEW public.petani_public AS
SELECT 
  id,
  kode_petani,
  nama,
  alamat,
  created_at
FROM public.petani;