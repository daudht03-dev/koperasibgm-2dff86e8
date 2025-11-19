-- Create harvest records table
CREATE TABLE public.panen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lahan_id UUID NOT NULL REFERENCES public.lahan(id) ON DELETE CASCADE,
  tanggal_panen DATE NOT NULL,
  jumlah_kg NUMERIC NOT NULL CHECK (jumlah_kg > 0),
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.panen ENABLE ROW LEVEL SECURITY;

-- Create policies for panen
CREATE POLICY "Panen are viewable by everyone" 
ON public.panen 
FOR SELECT 
USING (true);

CREATE POLICY "Only authenticated users can manage panen" 
ON public.panen 
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add index for better query performance
CREATE INDEX idx_panen_lahan_id ON public.panen(lahan_id);
CREATE INDEX idx_panen_tanggal ON public.panen(tanggal_panen);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_panen_updated_at
BEFORE UPDATE ON public.panen
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();