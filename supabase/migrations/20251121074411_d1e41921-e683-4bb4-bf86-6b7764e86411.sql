-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Only admins can manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Remove role column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

-- Update RLS policies for petani table
DROP POLICY IF EXISTS "Petani are viewable by everyone" ON public.petani;
DROP POLICY IF EXISTS "Only authenticated users can manage petani" ON public.petani;

CREATE POLICY "Admins can manage petani"
ON public.petani
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create public view for QR code functionality (non-sensitive fields only)
CREATE OR REPLACE VIEW public.petani_public AS
SELECT 
  id,
  kode_petani,
  nama,
  created_at
FROM public.petani;

-- Allow public read access to the view
GRANT SELECT ON public.petani_public TO anon, authenticated;

-- Update RLS policies for lahan table
DROP POLICY IF EXISTS "Lahan are viewable by everyone" ON public.lahan;
DROP POLICY IF EXISTS "Only authenticated users can manage lahan" ON public.lahan;

CREATE POLICY "Admins can view all lahan"
ON public.lahan
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage lahan"
ON public.lahan
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update lahan"
ON public.lahan
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete lahan"
ON public.lahan
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for konten_website table
DROP POLICY IF EXISTS "Konten website are viewable by everyone" ON public.konten_website;
DROP POLICY IF EXISTS "Only authenticated users can manage konten" ON public.konten_website;

CREATE POLICY "Public can view konten website"
ON public.konten_website
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage konten website"
ON public.konten_website
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update konten website"
ON public.konten_website
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete konten website"
ON public.konten_website
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for panen table
DROP POLICY IF EXISTS "Panen are viewable by everyone" ON public.panen;
DROP POLICY IF EXISTS "Only authenticated users can manage panen" ON public.panen;

CREATE POLICY "Admins can view all panen"
ON public.panen
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage panen"
ON public.panen
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update panen"
ON public.panen
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete panen"
ON public.panen
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for produk table
DROP POLICY IF EXISTS "Produk are viewable by everyone" ON public.produk;
DROP POLICY IF EXISTS "Only authenticated users can manage produk" ON public.produk;

CREATE POLICY "Public can view produk"
ON public.produk
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage produk"
ON public.produk
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update produk"
ON public.produk
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete produk"
ON public.produk
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for profil_perusahaan table
DROP POLICY IF EXISTS "Profil perusahaan are viewable by everyone" ON public.profil_perusahaan;
DROP POLICY IF EXISTS "Only authenticated users can manage profil perusahaan" ON public.profil_perusahaan;

CREATE POLICY "Public can view profil perusahaan"
ON public.profil_perusahaan
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins can manage profil perusahaan"
ON public.profil_perusahaan
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update profil perusahaan"
ON public.profil_perusahaan
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profil perusahaan"
ON public.profil_perusahaan
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));