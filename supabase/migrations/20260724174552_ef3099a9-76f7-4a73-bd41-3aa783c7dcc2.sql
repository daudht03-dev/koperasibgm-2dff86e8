
CREATE TABLE public.village_prefixes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON public.village_prefixes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.village_prefixes TO authenticated;
GRANT ALL ON public.village_prefixes TO service_role;

ALTER TABLE public.village_prefixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view village prefixes"
ON public.village_prefixes FOR SELECT
USING (true);

CREATE POLICY "Admins can insert village prefixes"
ON public.village_prefixes FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update village prefixes"
ON public.village_prefixes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete village prefixes"
ON public.village_prefixes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_village_prefixes_updated_at
BEFORE UPDATE ON public.village_prefixes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.village_prefixes (code, name) VALUES
  ('MT', 'Metenggeng'),
  ('PK', 'Pekuncen'),
  ('BN', 'Banjaranyar'),
  ('KR', 'Karangkemiri')
ON CONFLICT (code) DO NOTHING;
