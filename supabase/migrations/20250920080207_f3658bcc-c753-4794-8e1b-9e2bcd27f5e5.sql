-- Create profiles table for admin users
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create petani table
CREATE TABLE public.petani (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kode_petani TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  alamat TEXT NOT NULL,
  rata_rata_panen DECIMAL(10,2),
  no_telepon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.petani ENABLE ROW LEVEL SECURITY;

-- Petani policies (readable by everyone, manageable by admin)
CREATE POLICY "Petani are viewable by everyone" 
ON public.petani 
FOR SELECT 
USING (true);

CREATE POLICY "Only authenticated users can manage petani" 
ON public.petani 
FOR ALL 
TO authenticated
USING (true);

-- Create lahan table
CREATE TABLE public.lahan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  petani_id UUID NOT NULL REFERENCES public.petani(id) ON DELETE CASCADE,
  luas DECIMAL(10,2) NOT NULL,
  alamat TEXT NOT NULL,
  koordinat TEXT,
  jumlah_tanaman INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lahan ENABLE ROW LEVEL SECURITY;

-- Lahan policies
CREATE POLICY "Lahan are viewable by everyone" 
ON public.lahan 
FOR SELECT 
USING (true);

CREATE POLICY "Only authenticated users can manage lahan" 
ON public.lahan 
FOR ALL 
TO authenticated
USING (true);

-- Create konten_website table
CREATE TABLE public.konten_website (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL UNIQUE,
  judul TEXT,
  isi TEXT,
  gambar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.konten_website ENABLE ROW LEVEL SECURITY;

-- Konten website policies
CREATE POLICY "Konten website are viewable by everyone" 
ON public.konten_website 
FOR SELECT 
USING (true);

CREATE POLICY "Only authenticated users can manage konten" 
ON public.konten_website 
FOR ALL 
TO authenticated
USING (true);

-- Insert default content
INSERT INTO public.konten_website (section, judul, isi) VALUES
('hero', 'Gula Kelapa Organik Berkualitas Tinggi', 'Dari kebun petani lokal langsung ke meja Anda. Diproduksi dengan standar organik terbaik untuk kesehatan keluarga.'),
('about', 'Tentang Berkah Gendis Official', 'Berkah Gendis Official adalah perusahaan yang berkomitmen menghasilkan gula kelapa organik berkualitas tinggi. Kami bekerja sama langsung dengan petani lokal untuk memastikan kualitas dan keberlanjutan produk.'),
('products', 'Produk Kami', 'Gula kelapa organik premium yang diproses secara tradisional dan higienis. Tanpa bahan pengawet, tanpa pewarna buatan, 100% alami dari nira kelapa segar.');

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petani_updated_at
  BEFORE UPDATE ON public.petani
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lahan_updated_at
  BEFORE UPDATE ON public.lahan
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_konten_website_updated_at
  BEFORE UPDATE ON public.konten_website
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();