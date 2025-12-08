-- Phase 1: Add organic/conventional status to relevant tables

-- 1. Add is_organic column to petani table
ALTER TABLE public.petani ADD COLUMN IF NOT EXISTS is_organic BOOLEAN DEFAULT true;

-- 2. Add is_organic column to penjualan_petani table
ALTER TABLE public.penjualan_petani ADD COLUMN IF NOT EXISTS is_organic BOOLEAN DEFAULT true;

-- 3. Add columns to pengambilan_koperasi for lot info and organic status
ALTER TABLE public.pengambilan_koperasi 
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS is_organic BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS detail_petani JSONB;

-- 4. Add is_organic column to batch_panen
ALTER TABLE public.batch_panen ADD COLUMN IF NOT EXISTS is_organic BOOLEAN DEFAULT true;

-- 5. Add pengaturan_petani column to estimasi_panen for saving farmer settings
ALTER TABLE public.estimasi_panen ADD COLUMN IF NOT EXISTS pengaturan_petani JSONB;

-- 6. Add columns to proses_pengeringan for calculations
ALTER TABLE public.proses_pengeringan 
  ADD COLUMN IF NOT EXISTS lot_number TEXT,
  ADD COLUMN IF NOT EXISTS susut_persen NUMERIC,
  ADD COLUMN IF NOT EXISTS susut_qc_off_persen NUMERIC,
  ADD COLUMN IF NOT EXISTS total_kering NUMERIC,
  ADD COLUMN IF NOT EXISTS qc_off NUMERIC,
  ADD COLUMN IF NOT EXISTS total_kering_packing NUMERIC,
  ADD COLUMN IF NOT EXISTS detail_petani JSONB,
  ADD COLUMN IF NOT EXISTS is_organic BOOLEAN DEFAULT true;

-- 7. Add columns to gudang_stok for stock type and organic status
ALTER TABLE public.gudang_stok 
  ADD COLUMN IF NOT EXISTS tipe_stok TEXT DEFAULT 'bahan_baku',
  ADD COLUMN IF NOT EXISTS is_organic BOOLEAN DEFAULT true;