CREATE TABLE public.dokumen_review (
  id uuid primary key default gen_random_uuid(),
  foto_id uuid not null references public.foto_lahan(id) on delete cascade,
  hasil jsonb not null,
  verdict text,
  model text,
  reviewed_by uuid,
  created_at timestamp with time zone not null default now()
);

CREATE INDEX idx_dokumen_review_foto ON public.dokumen_review(foto_id, created_at DESC);

GRANT SELECT ON public.dokumen_review TO authenticated;
GRANT ALL ON public.dokumen_review TO service_role;

ALTER TABLE public.dokumen_review ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dokumen reviews readable by staff roles"
  ON public.dokumen_review
  FOR SELECT
  TO authenticated
  USING (
    public.has_any_role(
      auth.uid(),
      ARRAY['admin','developer','staf_lapang','pengawas','auditor']::public.app_role[]
    )
  );

COMMENT ON TABLE public.dokumen_review IS 'Hasil tinjauan AI atas foto dokumen (KTP/pelatihan) petani; pembacaan dibatasi peran staf karena bisa berisi isi dokumen sensitif.';