-- Create produk table
CREATE TABLE public.produk (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  deskripsi TEXT,
  harga NUMERIC,
  gambar_url TEXT,
  kategori TEXT,
  stok INTEGER DEFAULT 0,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produk ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view products" 
ON public.produk 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage products" 
ON public.produk 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_produk_updated_at
BEFORE UPDATE ON public.produk
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();