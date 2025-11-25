-- Create table for farmer label settings
CREATE TABLE IF NOT EXISTS public.label_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  petani_id uuid NOT NULL REFERENCES public.petani(id) ON DELETE CASCADE,
  eu_certified boolean NOT NULL DEFAULT false,
  cor_nop_certified boolean NOT NULL DEFAULT false,
  sni_certified boolean NOT NULL DEFAULT false,
  is_organic boolean NOT NULL DEFAULT true,
  berat_kg numeric DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(petani_id)
);

-- Enable RLS
ALTER TABLE public.label_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage label settings"
ON public.label_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_label_settings_petani_id ON public.label_settings(petani_id);