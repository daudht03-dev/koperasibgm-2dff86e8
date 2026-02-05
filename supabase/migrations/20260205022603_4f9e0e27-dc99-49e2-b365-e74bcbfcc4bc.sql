-- Create changelog table
CREATE TABLE public.changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  judul text NOT NULL,
  is_latest boolean DEFAULT false,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;

-- Everyone can view changelog
CREATE POLICY "Everyone can view changelog"
ON public.changelog FOR SELECT
USING (true);

-- Only admins can manage changelog
CREATE POLICY "Admins can manage changelog"
ON public.changelog FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert initial data from existing changelog
INSERT INTO public.changelog (version, tanggal, judul, is_latest, changes) VALUES
('1.3.0', '2025-02-05', 'Update Estimasi Panen & PWA', true, '[
  {"type": "feature", "description": "Fitur import rata-rata panen dari file CSV pada import petani"},
  {"type": "feature", "description": "Mode persentase (gacha) untuk pengaturan hari libur dengan rate yang bisa dikustomisasi"},
  {"type": "feature", "description": "Pengelompokan petani berdasarkan regulasi EU dan COR"},
  {"type": "feature", "description": "Notifikasi update otomatis untuk PWA yang sudah terinstal"},
  {"type": "feature", "description": "Halaman changelog untuk melihat riwayat perubahan aplikasi"},
  {"type": "improvement", "description": "Template CSV petani sekarang mendukung kolom rata-rata panen dan regulasi"}
]'::jsonb),
('1.2.0', '2025-02-01', 'Manajemen Panen & Gudang', false, '[
  {"type": "feature", "description": "Tab Barang Masuk untuk pencatatan penerimaan barang"},
  {"type": "feature", "description": "Tab Gudang untuk manajemen stok di gudang"},
  {"type": "feature", "description": "Tab Pengovenan untuk proses pengeringan"},
  {"type": "feature", "description": "Laporan pengepul dengan detail transaksi"},
  {"type": "improvement", "description": "Optimasi performa loading data petani"}
]'::jsonb),
('1.1.0', '2025-01-25', 'Label & QR Code', false, '[
  {"type": "feature", "description": "Generator label kemasan dengan template kustom"},
  {"type": "feature", "description": "Label identitas petani dengan QR code"},
  {"type": "feature", "description": "Batch print QR code untuk semua petani"},
  {"type": "improvement", "description": "Desain label yang lebih profesional"},
  {"type": "fix", "description": "Perbaikan ukuran QR code pada print"}
]'::jsonb),
('1.0.0', '2025-01-15', 'Rilis Pertama', false, '[
  {"type": "feature", "description": "Dashboard admin dengan statistik lengkap"},
  {"type": "feature", "description": "Manajemen data petani"},
  {"type": "feature", "description": "Manajemen lahan per petani"},
  {"type": "feature", "description": "Profil petani publik dengan QR code"},
  {"type": "feature", "description": "PWA support untuk instalasi di perangkat"},
  {"type": "feature", "description": "Mode offline untuk data petani"}
]'::jsonb);

-- Create trigger for updated_at
CREATE TRIGGER update_changelog_updated_at
BEFORE UPDATE ON public.changelog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();