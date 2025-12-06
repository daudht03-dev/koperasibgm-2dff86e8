-- Create enum for batch status
CREATE TYPE public.batch_status AS ENUM ('penerimaan', 'pengeringan', 'penyimpanan', 'pengolahan', 'penjualan', 'selesai');

-- Create enum for quality grade
CREATE TYPE public.quality_grade AS ENUM ('premium', 'grade_a', 'grade_b', 'grade_c');

-- Create enum for certification type
CREATE TYPE public.certification_type AS ENUM ('organik', 'konvensional');

-- ========================================
-- Table: batch_panen (Penerimaan Hasil Panen)
-- ========================================
CREATE TABLE public.batch_panen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number TEXT NOT NULL UNIQUE,
    petani_id UUID NOT NULL REFERENCES public.petani(id) ON DELETE CASCADE,
    lahan_id UUID REFERENCES public.lahan(id) ON DELETE SET NULL,
    tanggal_penerimaan DATE NOT NULL DEFAULT CURRENT_DATE,
    jumlah_kg NUMERIC NOT NULL,
    kadar_air NUMERIC,
    kualitas quality_grade DEFAULT 'grade_a',
    sertifikasi certification_type DEFAULT 'organik',
    harga_per_kg NUMERIC,
    total_harga NUMERIC GENERATED ALWAYS AS (jumlah_kg * harga_per_kg) STORED,
    kondisi TEXT,
    catatan TEXT,
    status batch_status DEFAULT 'penerimaan',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- Table: proses_pengeringan (Oven/Drying Process)
-- ========================================
CREATE TABLE public.proses_pengeringan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batch_panen(id) ON DELETE CASCADE,
    tanggal_mulai TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    tanggal_selesai TIMESTAMP WITH TIME ZONE,
    suhu_oven NUMERIC,
    durasi_jam NUMERIC,
    kadar_air_awal NUMERIC,
    kadar_air_akhir NUMERIC,
    jumlah_kg_sebelum NUMERIC NOT NULL,
    jumlah_kg_sesudah NUMERIC,
    penyusutan_kg NUMERIC GENERATED ALWAYS AS (jumlah_kg_sebelum - COALESCE(jumlah_kg_sesudah, jumlah_kg_sebelum)) STORED,
    operator TEXT,
    catatan TEXT,
    status TEXT DEFAULT 'proses',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- Table: gudang_stok (Warehouse Storage)
-- ========================================
CREATE TABLE public.gudang_stok (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batch_panen(id) ON DELETE CASCADE,
    lokasi_gudang TEXT NOT NULL DEFAULT 'Gudang Utama',
    rak_posisi TEXT,
    tanggal_masuk DATE NOT NULL DEFAULT CURRENT_DATE,
    tanggal_keluar DATE,
    jumlah_kg NUMERIC NOT NULL,
    kondisi_penyimpanan TEXT,
    suhu_gudang NUMERIC,
    kelembaban NUMERIC,
    catatan TEXT,
    status TEXT DEFAULT 'tersimpan',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- Table: pengolahan_dokumen (Document Processing)
-- ========================================
CREATE TABLE public.pengolahan_dokumen (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batch_panen(id) ON DELETE CASCADE,
    nomor_dokumen TEXT NOT NULL UNIQUE,
    jenis_dokumen TEXT NOT NULL,
    tanggal_dokumen DATE NOT NULL DEFAULT CURRENT_DATE,
    penerbit TEXT,
    masa_berlaku DATE,
    file_url TEXT,
    catatan TEXT,
    status TEXT DEFAULT 'aktif',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- Table: penjualan (Sales)
-- ========================================
CREATE TABLE public.penjualan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.batch_panen(id) ON DELETE CASCADE,
    nomor_invoice TEXT NOT NULL UNIQUE,
    tanggal_penjualan DATE NOT NULL DEFAULT CURRENT_DATE,
    pembeli TEXT NOT NULL,
    alamat_pembeli TEXT,
    jumlah_kg NUMERIC NOT NULL,
    harga_per_kg NUMERIC NOT NULL,
    total_harga NUMERIC GENERATED ALWAYS AS (jumlah_kg * harga_per_kg) STORED,
    metode_pembayaran TEXT,
    status_pembayaran TEXT DEFAULT 'pending',
    tanggal_kirim DATE,
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- Enable RLS on all tables
-- ========================================
ALTER TABLE public.batch_panen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proses_pengeringan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gudang_stok ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengolahan_dokumen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penjualan ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS Policies for batch_panen
-- ========================================
CREATE POLICY "Everyone can view batch_panen" 
ON public.batch_panen FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage batch_panen" 
ON public.batch_panen FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- RLS Policies for proses_pengeringan
-- ========================================
CREATE POLICY "Everyone can view proses_pengeringan" 
ON public.proses_pengeringan FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage proses_pengeringan" 
ON public.proses_pengeringan FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- RLS Policies for gudang_stok
-- ========================================
CREATE POLICY "Everyone can view gudang_stok" 
ON public.gudang_stok FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage gudang_stok" 
ON public.gudang_stok FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- RLS Policies for pengolahan_dokumen
-- ========================================
CREATE POLICY "Everyone can view pengolahan_dokumen" 
ON public.pengolahan_dokumen FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage pengolahan_dokumen" 
ON public.pengolahan_dokumen FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- RLS Policies for penjualan
-- ========================================
CREATE POLICY "Everyone can view penjualan" 
ON public.penjualan FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage penjualan" 
ON public.penjualan FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- Triggers for updated_at
-- ========================================
CREATE TRIGGER update_batch_panen_updated_at
BEFORE UPDATE ON public.batch_panen
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proses_pengeringan_updated_at
BEFORE UPDATE ON public.proses_pengeringan
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gudang_stok_updated_at
BEFORE UPDATE ON public.gudang_stok
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pengolahan_dokumen_updated_at
BEFORE UPDATE ON public.pengolahan_dokumen
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_penjualan_updated_at
BEFORE UPDATE ON public.penjualan
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Function to generate batch number
-- ========================================
CREATE OR REPLACE FUNCTION public.generate_batch_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_year TEXT;
    v_month TEXT;
    v_sequence INTEGER;
    v_batch_number TEXT;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(batch_number FROM 12 FOR 4) AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM public.batch_panen
    WHERE batch_number LIKE 'BATCH-' || v_year || v_month || '%';
    
    v_batch_number := 'BATCH-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_batch_number;
END;
$$;

-- ========================================
-- Function to generate invoice number
-- ========================================
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_year TEXT;
    v_month TEXT;
    v_sequence INTEGER;
    v_invoice_number TEXT;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(nomor_invoice FROM 11 FOR 4) AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM public.penjualan
    WHERE nomor_invoice LIKE 'INV-' || v_year || v_month || '%';
    
    v_invoice_number := 'INV-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_invoice_number;
END;
$$;