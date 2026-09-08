CREATE TABLE public.log_penghapusan_batch (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipe text NOT NULL CHECK (tipe IN ('petani','lahan')),
  jumlah_dihapus integer NOT NULL DEFAULT 0,
  ringkasan_cascade jsonb NOT NULL DEFAULT '{}'::jsonb,
  daftar_terhapus jsonb NOT NULL DEFAULT '[]'::jsonb,
  dihapus_oleh uuid REFERENCES auth.users(id),
  alasan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.log_penghapusan_batch TO authenticated;
GRANT ALL ON public.log_penghapusan_batch TO service_role;

ALTER TABLE public.log_penghapusan_batch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin dan developer dapat melihat log penghapusan"
ON public.log_penghapusan_batch
FOR SELECT
TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','developer']::app_role[]));

CREATE POLICY "Admin dan developer dapat menambah log penghapusan"
ON public.log_penghapusan_batch
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['admin','developer']::app_role[])
  AND dihapus_oleh = auth.uid()
);