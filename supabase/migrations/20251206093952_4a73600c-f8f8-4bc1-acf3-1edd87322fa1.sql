-- Create pengepul table
CREATE TABLE public.pengepul (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_pengepul text NOT NULL UNIQUE,
  nama text NOT NULL,
  alamat text,
  no_telepon text,
  harga_beli numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'aktif',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pengepul ENABLE ROW LEVEL SECURITY;

-- RLS policies for pengepul
CREATE POLICY "Everyone can view pengepul"
ON public.pengepul FOR SELECT
USING (true);

CREATE POLICY "Admins can manage pengepul"
ON public.pengepul FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add pengepul_id to petani (exclusive assignment)
ALTER TABLE public.petani 
ADD COLUMN pengepul_id uuid REFERENCES public.pengepul(id) ON DELETE SET NULL;

-- Create penjualan_petani table (Barang Masuk Pengepul)
CREATE TABLE public.penjualan_petani (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petani_id uuid NOT NULL REFERENCES public.petani(id) ON DELETE CASCADE,
  pengepul_id uuid NOT NULL REFERENCES public.pengepul(id) ON DELETE CASCADE,
  tanggal_jual date NOT NULL DEFAULT CURRENT_DATE,
  jumlah_kg numeric NOT NULL,
  harga_per_kg numeric NOT NULL,
  total_harga numeric GENERATED ALWAYS AS (jumlah_kg * harga_per_kg) STORED,
  warna_produk text,
  kualitas text DEFAULT 'grade_a',
  catatan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.penjualan_petani ENABLE ROW LEVEL SECURITY;

-- RLS policies for penjualan_petani
CREATE POLICY "Admins can view penjualan_petani"
ON public.penjualan_petani FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage penjualan_petani"
ON public.penjualan_petani FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create pengambilan_koperasi table (Barang Keluar Pengepul)
CREATE TABLE public.pengambilan_koperasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pengepul_id uuid NOT NULL REFERENCES public.pengepul(id) ON DELETE CASCADE,
  tanggal_ambil date NOT NULL DEFAULT CURRENT_DATE,
  jumlah_kg numeric NOT NULL,
  batch_id uuid REFERENCES public.batch_panen(id) ON DELETE SET NULL,
  catatan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pengambilan_koperasi ENABLE ROW LEVEL SECURITY;

-- RLS policies for pengambilan_koperasi
CREATE POLICY "Admins can view pengambilan_koperasi"
ON public.pengambilan_koperasi FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage pengambilan_koperasi"
ON public.pengambilan_koperasi FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update batch_panen table
ALTER TABLE public.batch_panen DROP COLUMN IF EXISTS sertifikasi;
ALTER TABLE public.batch_panen DROP COLUMN IF EXISTS catatan;

-- Rename kadar_air to warna_produk and change type
ALTER TABLE public.batch_panen RENAME COLUMN kadar_air TO warna_produk;
ALTER TABLE public.batch_panen ALTER COLUMN warna_produk TYPE text USING warna_produk::text;

-- Add pengepul references to batch_panen
ALTER TABLE public.batch_panen ADD COLUMN pengepul_ids uuid[] DEFAULT '{}';

-- Create triggers for updated_at
CREATE TRIGGER update_pengepul_updated_at
BEFORE UPDATE ON public.pengepul
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_penjualan_petani_updated_at
BEFORE UPDATE ON public.penjualan_petani
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pengambilan_koperasi_updated_at
BEFORE UPDATE ON public.pengambilan_koperasi
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Generate kode_pengepul function
CREATE OR REPLACE FUNCTION public.generate_kode_pengepul()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
    v_sequence INTEGER;
    v_kode TEXT;
BEGIN
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(kode_pengepul FROM 5) AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM public.pengepul
    WHERE kode_pengepul LIKE 'PGP-%';
    
    v_kode := 'PGP-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_kode;
END;
$function$;