-- Create storage buckets for product images and company logo
INSERT INTO storage.buckets (id, name, public) VALUES 
('produk', 'produk', true),
('profil-perusahaan', 'profil-perusahaan', true);

-- Create products table
CREATE TABLE public.produk (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  deskripsi TEXT,
  harga DECIMAL(12,2) NOT NULL,
  gambar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company profile table
CREATE TABLE public.profil_perusahaan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_perusahaan TEXT NOT NULL,
  deskripsi TEXT,
  logo_url TEXT,
  alamat TEXT,
  kontak TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.produk ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil_perusahaan ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
CREATE POLICY "Produk are viewable by everyone" 
ON public.produk 
FOR SELECT 
USING (true);

CREATE POLICY "Only authenticated users can manage produk" 
ON public.produk 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for company profile
CREATE POLICY "Profil perusahaan are viewable by everyone" 
ON public.profil_perusahaan 
FOR SELECT 
USING (true);

CREATE POLICY "Only authenticated users can manage profil perusahaan" 
ON public.profil_perusahaan 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create storage policies for product images
CREATE POLICY "Product images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'produk');

CREATE POLICY "Authenticated users can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'produk' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'produk' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'produk' AND auth.uid() IS NOT NULL);

-- Create storage policies for company logo
CREATE POLICY "Company logo are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profil-perusahaan');

CREATE POLICY "Authenticated users can upload company logo" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profil-perusahaan' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update company logo" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profil-perusahaan' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete company logo" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profil-perusahaan' AND auth.uid() IS NOT NULL);

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_produk_updated_at
BEFORE UPDATE ON public.produk
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profil_perusahaan_updated_at
BEFORE UPDATE ON public.profil_perusahaan
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company profile
INSERT INTO public.profil_perusahaan (nama_perusahaan, deskripsi, alamat, kontak)
VALUES (
  'Berkah Gendis Official',
  'Produsen gula kelapa organik berkualitas tinggi dari petani lokal Indonesia',
  'Jl. Raya Organik No. 123, Indonesia',
  'contact@berkahgendis.com | +62 812-3456-7890'
);