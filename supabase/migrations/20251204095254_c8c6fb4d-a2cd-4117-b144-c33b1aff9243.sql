-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Function to check user role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create profil_perusahaan (company profile) table
CREATE TABLE public.profil_perusahaan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_perusahaan TEXT NOT NULL,
  deskripsi TEXT,
  logo_url TEXT,
  alamat TEXT,
  kontak TEXT,
  production_url TEXT,
  label_primary_color TEXT,
  label_background_start TEXT,
  label_background_end TEXT,
  label_font_family TEXT,
  label_template TEXT,
  qr_size INTEGER DEFAULT 100,
  qr_error_correction TEXT DEFAULT 'M',
  qr_logo_url TEXT,
  qr_logo_size INTEGER DEFAULT 30,
  template_settings JSONB,
  custom_fields JSONB,
  identity_label_primary_color TEXT,
  identity_label_font_family TEXT,
  identity_label_settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profil_perusahaan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view company profile"
ON public.profil_perusahaan FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage company profile"
ON public.profil_perusahaan FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create petani (farmers) table
CREATE TABLE public.petani (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_petani TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  alamat TEXT,
  no_telepon TEXT,
  foto_url TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'aktif',
  tanggal_bergabung DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.petani ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view farmers"
ON public.petani FOR SELECT
USING (true);

CREATE POLICY "Admins can manage farmers"
ON public.petani FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create lahan (lands) table
CREATE TABLE public.lahan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petani_id UUID REFERENCES public.petani(id) ON DELETE CASCADE,
  nama_lahan TEXT NOT NULL,
  luas DECIMAL(10,2),
  lokasi TEXT,
  koordinat TEXT,
  jenis_tanah TEXT,
  status TEXT DEFAULT 'aktif',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.lahan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view lands"
ON public.lahan FOR SELECT
USING (true);

CREATE POLICY "Admins can manage lands"
ON public.lahan FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create panen (harvests) table
CREATE TABLE public.panen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petani_id UUID REFERENCES public.petani(id) ON DELETE CASCADE,
  lahan_id UUID REFERENCES public.lahan(id) ON DELETE SET NULL,
  tanggal_panen DATE NOT NULL,
  jumlah_kg DECIMAL(10,2) NOT NULL,
  kualitas TEXT,
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.panen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view harvests"
ON public.panen FOR SELECT
USING (true);

CREATE POLICY "Admins can manage harvests"
ON public.panen FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create konten_website (website content) table
CREATE TABLE public.konten_website (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  judul TEXT,
  konten TEXT,
  gambar_url TEXT,
  urutan INTEGER DEFAULT 0,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.konten_website ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view website content"
ON public.konten_website FOR SELECT
USING (true);

CREATE POLICY "Admins can manage website content"
ON public.konten_website FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create label_settings table
CREATE TABLE public.label_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  petani_id UUID REFERENCES public.petani(id) ON DELETE CASCADE UNIQUE,
  primary_color TEXT,
  background_start TEXT,
  background_end TEXT,
  font_family TEXT,
  template TEXT,
  custom_fields JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.label_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view label settings"
ON public.label_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage label settings"
ON public.label_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for company profile
INSERT INTO storage.buckets (id, name, public) VALUES ('profil-perusahaan', 'profil-perusahaan', true);

-- Storage policies
CREATE POLICY "Public can view company profile files"
ON storage.objects FOR SELECT
USING (bucket_id = 'profil-perusahaan');

CREATE POLICY "Admins can upload company profile files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profil-perusahaan' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update company profile files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profil-perusahaan' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete company profile files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profil-perusahaan' AND public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for farmer photos/logos
INSERT INTO storage.buckets (id, name, public) VALUES ('petani', 'petani', true);

CREATE POLICY "Public can view farmer files"
ON storage.objects FOR SELECT
USING (bucket_id = 'petani');

CREATE POLICY "Admins can upload farmer files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'petani' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update farmer files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'petani' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete farmer files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'petani' AND public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_profil_perusahaan_updated_at
BEFORE UPDATE ON public.profil_perusahaan
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petani_updated_at
BEFORE UPDATE ON public.petani
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lahan_updated_at
BEFORE UPDATE ON public.lahan
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_panen_updated_at
BEFORE UPDATE ON public.panen
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_konten_website_updated_at
BEFORE UPDATE ON public.konten_website
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_label_settings_updated_at
BEFORE UPDATE ON public.label_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();