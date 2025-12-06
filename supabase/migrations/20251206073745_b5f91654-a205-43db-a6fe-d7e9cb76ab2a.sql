-- Create table for storing harvest estimation data
CREATE TABLE public.estimasi_panen (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_estimasi TEXT NOT NULL,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NOT NULL,
  data_petani JSONB NOT NULL,
  data_panen JSONB NOT NULL,
  data_penjualan JSONB NOT NULL,
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimasi_panen ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage estimasi_panen" 
ON public.estimasi_panen 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Everyone can view estimasi_panen" 
ON public.estimasi_panen 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_estimasi_panen_updated_at
BEFORE UPDATE ON public.estimasi_panen
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();