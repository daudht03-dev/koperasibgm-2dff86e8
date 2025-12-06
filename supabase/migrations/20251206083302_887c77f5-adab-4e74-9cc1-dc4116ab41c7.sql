-- Drop existing public SELECT policies
DROP POLICY IF EXISTS "Everyone can view penjualan" ON public.penjualan;
DROP POLICY IF EXISTS "Everyone can view pengolahan_dokumen" ON public.pengolahan_dokumen;
DROP POLICY IF EXISTS "Everyone can view gudang_stok" ON public.gudang_stok;
DROP POLICY IF EXISTS "Everyone can view proses_pengeringan" ON public.proses_pengeringan;
DROP POLICY IF EXISTS "Everyone can view batch_panen" ON public.batch_panen;

-- Create admin-only SELECT policies
CREATE POLICY "Only admins can view penjualan" 
ON public.penjualan 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can view pengolahan_dokumen" 
ON public.pengolahan_dokumen 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can view gudang_stok" 
ON public.gudang_stok 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can view proses_pengeringan" 
ON public.proses_pengeringan 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can view batch_panen" 
ON public.batch_panen 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));