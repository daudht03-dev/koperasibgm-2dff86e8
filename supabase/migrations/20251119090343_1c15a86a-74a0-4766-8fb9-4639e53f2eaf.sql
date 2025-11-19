-- Add petani_id column to lahan table
ALTER TABLE public.lahan
ADD COLUMN petani_id uuid REFERENCES public.petani(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_lahan_petani_id ON public.lahan(petani_id);