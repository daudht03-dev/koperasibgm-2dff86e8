-- Enable RLS on petani_public view is not possible, so we need to ensure
-- the underlying petani table allows public read access for the view

-- Create policy to allow public read access to petani table for the view
CREATE POLICY "Allow public read access to petani for public view"
ON public.petani
FOR SELECT
TO anon, authenticated
USING (true);

-- Also ensure lahan table allows public read (for FarmerProfile page)
ALTER TABLE public.lahan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to lahan"
ON public.lahan
FOR SELECT
TO anon, authenticated
USING (true);