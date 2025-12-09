CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: batch_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.batch_status AS ENUM (
    'penerimaan',
    'pengeringan',
    'penyimpanan',
    'pengolahan',
    'penjualan',
    'selesai'
);


--
-- Name: certification_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.certification_type AS ENUM (
    'organik',
    'konvensional'
);


--
-- Name: quality_grade; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quality_grade AS ENUM (
    'premium',
    'grade_a',
    'grade_b',
    'grade_c'
);


--
-- Name: generate_batch_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_batch_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_year TEXT;
    v_month TEXT;
    v_sequence INTEGER;
    v_batch_number TEXT;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(batch_number FROM 12 FOR 4) AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM public.batch_panen
    WHERE batch_number LIKE 'BATCH-' || v_year || v_month || '%';
    
    v_batch_number := 'BATCH-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_batch_number;
END;
$$;


--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invoice_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_year TEXT;
    v_month TEXT;
    v_sequence INTEGER;
    v_invoice_number TEXT;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(nomor_invoice FROM 11 FOR 4) AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM public.penjualan
    WHERE nomor_invoice LIKE 'INV-' || v_year || v_month || '%';
    
    v_invoice_number := 'INV-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_invoice_number;
END;
$$;


--
-- Name: generate_kode_pengepul(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_kode_pengepul() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
    v_sequence INTEGER;
    v_kode TEXT;
BEGIN
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(kode_pengepul FROM 5) AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM public.pengepul
    WHERE kode_pengepul LIKE 'PGP-%';
    
    v_kode := 'PGP-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_kode;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: batch_panen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_panen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_number text NOT NULL,
    petani_id uuid NOT NULL,
    lahan_id uuid,
    tanggal_penerimaan date DEFAULT CURRENT_DATE NOT NULL,
    jumlah_kg numeric NOT NULL,
    warna_produk text,
    kualitas public.quality_grade DEFAULT 'grade_a'::public.quality_grade,
    harga_per_kg numeric,
    total_harga numeric GENERATED ALWAYS AS ((jumlah_kg * harga_per_kg)) STORED,
    kondisi text,
    status public.batch_status DEFAULT 'penerimaan'::public.batch_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pengepul_ids uuid[] DEFAULT '{}'::uuid[],
    is_organic boolean DEFAULT true,
    detail_petani jsonb
);


--
-- Name: estimasi_panen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estimasi_panen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_estimasi text NOT NULL,
    tanggal_mulai date NOT NULL,
    tanggal_selesai date NOT NULL,
    data_petani jsonb NOT NULL,
    data_panen jsonb NOT NULL,
    data_penjualan jsonb NOT NULL,
    catatan text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pengaturan_petani jsonb
);


--
-- Name: gudang_stok; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gudang_stok (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    lokasi_gudang text DEFAULT 'Gudang Utama'::text NOT NULL,
    rak_posisi text,
    tanggal_masuk date DEFAULT CURRENT_DATE NOT NULL,
    tanggal_keluar date,
    jumlah_kg numeric NOT NULL,
    kondisi_penyimpanan text,
    suhu_gudang numeric,
    kelembaban numeric,
    catatan text,
    status text DEFAULT 'tersimpan'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tipe_stok text DEFAULT 'bahan_baku'::text,
    is_organic boolean DEFAULT true
);


--
-- Name: konten_website; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.konten_website (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section text NOT NULL,
    judul text,
    konten text,
    gambar_url text,
    urutan integer DEFAULT 0,
    aktif boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: label_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.label_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    petani_id uuid,
    primary_color text,
    background_start text,
    background_end text,
    font_family text,
    template text,
    custom_fields jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: lahan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lahan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    petani_id uuid,
    nama_lahan text NOT NULL,
    luas numeric(10,2),
    lokasi text,
    koordinat text,
    jenis_tanah text,
    status text DEFAULT 'aktif'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: panen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.panen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    petani_id uuid,
    lahan_id uuid,
    tanggal_panen date NOT NULL,
    jumlah_kg numeric(10,2) NOT NULL,
    kualitas text,
    catatan text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pengambilan_koperasi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pengambilan_koperasi (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pengepul_id uuid NOT NULL,
    tanggal_ambil date DEFAULT CURRENT_DATE NOT NULL,
    jumlah_kg numeric NOT NULL,
    batch_id uuid,
    catatan text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    lot_number text,
    is_organic boolean DEFAULT true,
    detail_petani jsonb
);


--
-- Name: pengepul; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pengepul (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kode_pengepul text NOT NULL,
    nama text NOT NULL,
    alamat text,
    no_telepon text,
    harga_beli numeric DEFAULT 0 NOT NULL,
    status text DEFAULT 'aktif'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pengolahan_dokumen; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pengolahan_dokumen (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    nomor_dokumen text NOT NULL,
    jenis_dokumen text NOT NULL,
    tanggal_dokumen date DEFAULT CURRENT_DATE NOT NULL,
    penerbit text,
    masa_berlaku date,
    file_url text,
    catatan text,
    status text DEFAULT 'aktif'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: penjualan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.penjualan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    nomor_invoice text NOT NULL,
    tanggal_penjualan date DEFAULT CURRENT_DATE NOT NULL,
    pembeli text NOT NULL,
    alamat_pembeli text,
    jumlah_kg numeric NOT NULL,
    harga_per_kg numeric NOT NULL,
    total_harga numeric GENERATED ALWAYS AS ((jumlah_kg * harga_per_kg)) STORED,
    metode_pembayaran text,
    status_pembayaran text DEFAULT 'pending'::text,
    tanggal_kirim date,
    catatan text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: penjualan_petani; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.penjualan_petani (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    petani_id uuid NOT NULL,
    pengepul_id uuid NOT NULL,
    tanggal_jual date DEFAULT CURRENT_DATE NOT NULL,
    jumlah_kg numeric NOT NULL,
    harga_per_kg numeric NOT NULL,
    total_harga numeric GENERATED ALWAYS AS ((jumlah_kg * harga_per_kg)) STORED,
    warna_produk text,
    kualitas text DEFAULT 'grade_a'::text,
    catatan text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_organic boolean DEFAULT true
);


--
-- Name: petani; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.petani (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kode_petani text NOT NULL,
    nama text NOT NULL,
    alamat text,
    no_telepon text,
    foto_url text,
    logo_url text,
    status text DEFAULT 'aktif'::text,
    tanggal_bergabung date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pengepul_id uuid,
    is_organic boolean DEFAULT true
);


--
-- Name: produk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produk (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama text NOT NULL,
    deskripsi text,
    harga numeric,
    gambar_url text,
    kategori text,
    stok integer DEFAULT 0,
    aktif boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profil_perusahaan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profil_perusahaan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_perusahaan text NOT NULL,
    deskripsi text,
    logo_url text,
    alamat text,
    kontak text,
    production_url text,
    label_primary_color text,
    label_background_start text,
    label_background_end text,
    label_font_family text,
    label_template text,
    qr_size integer DEFAULT 100,
    qr_error_correction text DEFAULT 'M'::text,
    qr_logo_url text,
    qr_logo_size integer DEFAULT 30,
    template_settings jsonb,
    custom_fields jsonb,
    identity_label_primary_color text,
    identity_label_font_family text,
    identity_label_settings jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: proses_pengeringan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proses_pengeringan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    tanggal_mulai timestamp with time zone DEFAULT now() NOT NULL,
    tanggal_selesai timestamp with time zone,
    suhu_oven numeric,
    durasi_jam numeric,
    kadar_air_awal numeric,
    kadar_air_akhir numeric,
    jumlah_kg_sebelum numeric NOT NULL,
    jumlah_kg_sesudah numeric,
    penyusutan_kg numeric GENERATED ALWAYS AS ((jumlah_kg_sebelum - COALESCE(jumlah_kg_sesudah, jumlah_kg_sebelum))) STORED,
    operator text,
    catatan text,
    status text DEFAULT 'proses'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    lot_number text,
    susut_persen numeric,
    susut_qc_off_persen numeric,
    total_kering numeric,
    qc_off numeric,
    total_kering_packing numeric,
    detail_petani jsonb,
    is_organic boolean DEFAULT true
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: batch_panen batch_panen_batch_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_panen
    ADD CONSTRAINT batch_panen_batch_number_key UNIQUE (batch_number);


--
-- Name: batch_panen batch_panen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_panen
    ADD CONSTRAINT batch_panen_pkey PRIMARY KEY (id);


--
-- Name: estimasi_panen estimasi_panen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estimasi_panen
    ADD CONSTRAINT estimasi_panen_pkey PRIMARY KEY (id);


--
-- Name: gudang_stok gudang_stok_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gudang_stok
    ADD CONSTRAINT gudang_stok_pkey PRIMARY KEY (id);


--
-- Name: konten_website konten_website_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.konten_website
    ADD CONSTRAINT konten_website_pkey PRIMARY KEY (id);


--
-- Name: label_settings label_settings_petani_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_settings
    ADD CONSTRAINT label_settings_petani_id_key UNIQUE (petani_id);


--
-- Name: label_settings label_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_settings
    ADD CONSTRAINT label_settings_pkey PRIMARY KEY (id);


--
-- Name: lahan lahan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lahan
    ADD CONSTRAINT lahan_pkey PRIMARY KEY (id);


--
-- Name: panen panen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.panen
    ADD CONSTRAINT panen_pkey PRIMARY KEY (id);


--
-- Name: pengambilan_koperasi pengambilan_koperasi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengambilan_koperasi
    ADD CONSTRAINT pengambilan_koperasi_pkey PRIMARY KEY (id);


--
-- Name: pengepul pengepul_kode_pengepul_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengepul
    ADD CONSTRAINT pengepul_kode_pengepul_key UNIQUE (kode_pengepul);


--
-- Name: pengepul pengepul_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengepul
    ADD CONSTRAINT pengepul_pkey PRIMARY KEY (id);


--
-- Name: pengolahan_dokumen pengolahan_dokumen_nomor_dokumen_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengolahan_dokumen
    ADD CONSTRAINT pengolahan_dokumen_nomor_dokumen_key UNIQUE (nomor_dokumen);


--
-- Name: pengolahan_dokumen pengolahan_dokumen_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengolahan_dokumen
    ADD CONSTRAINT pengolahan_dokumen_pkey PRIMARY KEY (id);


--
-- Name: penjualan penjualan_nomor_invoice_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_nomor_invoice_key UNIQUE (nomor_invoice);


--
-- Name: penjualan_petani penjualan_petani_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penjualan_petani
    ADD CONSTRAINT penjualan_petani_pkey PRIMARY KEY (id);


--
-- Name: penjualan penjualan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_pkey PRIMARY KEY (id);


--
-- Name: petani petani_kode_petani_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petani
    ADD CONSTRAINT petani_kode_petani_key UNIQUE (kode_petani);


--
-- Name: petani petani_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petani
    ADD CONSTRAINT petani_pkey PRIMARY KEY (id);


--
-- Name: produk produk_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produk
    ADD CONSTRAINT produk_pkey PRIMARY KEY (id);


--
-- Name: profil_perusahaan profil_perusahaan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profil_perusahaan
    ADD CONSTRAINT profil_perusahaan_pkey PRIMARY KEY (id);


--
-- Name: proses_pengeringan proses_pengeringan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proses_pengeringan
    ADD CONSTRAINT proses_pengeringan_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: batch_panen update_batch_panen_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_batch_panen_updated_at BEFORE UPDATE ON public.batch_panen FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: estimasi_panen update_estimasi_panen_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_estimasi_panen_updated_at BEFORE UPDATE ON public.estimasi_panen FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gudang_stok update_gudang_stok_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gudang_stok_updated_at BEFORE UPDATE ON public.gudang_stok FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: konten_website update_konten_website_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_konten_website_updated_at BEFORE UPDATE ON public.konten_website FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: label_settings update_label_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_label_settings_updated_at BEFORE UPDATE ON public.label_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: lahan update_lahan_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_lahan_updated_at BEFORE UPDATE ON public.lahan FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: panen update_panen_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_panen_updated_at BEFORE UPDATE ON public.panen FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pengambilan_koperasi update_pengambilan_koperasi_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pengambilan_koperasi_updated_at BEFORE UPDATE ON public.pengambilan_koperasi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pengepul update_pengepul_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pengepul_updated_at BEFORE UPDATE ON public.pengepul FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pengolahan_dokumen update_pengolahan_dokumen_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pengolahan_dokumen_updated_at BEFORE UPDATE ON public.pengolahan_dokumen FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: penjualan_petani update_penjualan_petani_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_penjualan_petani_updated_at BEFORE UPDATE ON public.penjualan_petani FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: penjualan update_penjualan_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_penjualan_updated_at BEFORE UPDATE ON public.penjualan FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: petani update_petani_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_petani_updated_at BEFORE UPDATE ON public.petani FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: produk update_produk_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_produk_updated_at BEFORE UPDATE ON public.produk FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profil_perusahaan update_profil_perusahaan_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profil_perusahaan_updated_at BEFORE UPDATE ON public.profil_perusahaan FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: proses_pengeringan update_proses_pengeringan_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_proses_pengeringan_updated_at BEFORE UPDATE ON public.proses_pengeringan FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: batch_panen batch_panen_lahan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_panen
    ADD CONSTRAINT batch_panen_lahan_id_fkey FOREIGN KEY (lahan_id) REFERENCES public.lahan(id) ON DELETE SET NULL;


--
-- Name: batch_panen batch_panen_petani_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_panen
    ADD CONSTRAINT batch_panen_petani_id_fkey FOREIGN KEY (petani_id) REFERENCES public.petani(id) ON DELETE CASCADE;


--
-- Name: gudang_stok gudang_stok_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gudang_stok
    ADD CONSTRAINT gudang_stok_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_panen(id) ON DELETE CASCADE;


--
-- Name: label_settings label_settings_petani_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.label_settings
    ADD CONSTRAINT label_settings_petani_id_fkey FOREIGN KEY (petani_id) REFERENCES public.petani(id) ON DELETE CASCADE;


--
-- Name: lahan lahan_petani_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lahan
    ADD CONSTRAINT lahan_petani_id_fkey FOREIGN KEY (petani_id) REFERENCES public.petani(id) ON DELETE CASCADE;


--
-- Name: panen panen_lahan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.panen
    ADD CONSTRAINT panen_lahan_id_fkey FOREIGN KEY (lahan_id) REFERENCES public.lahan(id) ON DELETE SET NULL;


--
-- Name: panen panen_petani_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.panen
    ADD CONSTRAINT panen_petani_id_fkey FOREIGN KEY (petani_id) REFERENCES public.petani(id) ON DELETE CASCADE;


--
-- Name: pengambilan_koperasi pengambilan_koperasi_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengambilan_koperasi
    ADD CONSTRAINT pengambilan_koperasi_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_panen(id) ON DELETE SET NULL;


--
-- Name: pengambilan_koperasi pengambilan_koperasi_pengepul_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengambilan_koperasi
    ADD CONSTRAINT pengambilan_koperasi_pengepul_id_fkey FOREIGN KEY (pengepul_id) REFERENCES public.pengepul(id) ON DELETE CASCADE;


--
-- Name: pengolahan_dokumen pengolahan_dokumen_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengolahan_dokumen
    ADD CONSTRAINT pengolahan_dokumen_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_panen(id) ON DELETE CASCADE;


--
-- Name: penjualan penjualan_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penjualan
    ADD CONSTRAINT penjualan_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_panen(id) ON DELETE CASCADE;


--
-- Name: penjualan_petani penjualan_petani_pengepul_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penjualan_petani
    ADD CONSTRAINT penjualan_petani_pengepul_id_fkey FOREIGN KEY (pengepul_id) REFERENCES public.pengepul(id) ON DELETE CASCADE;


--
-- Name: penjualan_petani penjualan_petani_petani_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penjualan_petani
    ADD CONSTRAINT penjualan_petani_petani_id_fkey FOREIGN KEY (petani_id) REFERENCES public.petani(id) ON DELETE CASCADE;


--
-- Name: petani petani_pengepul_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.petani
    ADD CONSTRAINT petani_pengepul_id_fkey FOREIGN KEY (pengepul_id) REFERENCES public.pengepul(id) ON DELETE SET NULL;


--
-- Name: proses_pengeringan proses_pengeringan_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proses_pengeringan
    ADD CONSTRAINT proses_pengeringan_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batch_panen(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can manage all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: batch_panen Admins can manage batch_panen; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage batch_panen" ON public.batch_panen USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profil_perusahaan Admins can manage company profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage company profile" ON public.profil_perusahaan TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: estimasi_panen Admins can manage estimasi_panen; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage estimasi_panen" ON public.estimasi_panen USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: petani Admins can manage farmers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage farmers" ON public.petani TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: gudang_stok Admins can manage gudang_stok; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage gudang_stok" ON public.gudang_stok USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: panen Admins can manage harvests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage harvests" ON public.panen TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: label_settings Admins can manage label settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage label settings" ON public.label_settings TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: lahan Admins can manage lands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage lands" ON public.lahan TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pengambilan_koperasi Admins can manage pengambilan_koperasi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage pengambilan_koperasi" ON public.pengambilan_koperasi USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pengepul Admins can manage pengepul; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage pengepul" ON public.pengepul USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pengolahan_dokumen Admins can manage pengolahan_dokumen; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage pengolahan_dokumen" ON public.pengolahan_dokumen USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: penjualan Admins can manage penjualan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage penjualan" ON public.penjualan USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: penjualan_petani Admins can manage penjualan_petani; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage penjualan_petani" ON public.penjualan_petani USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: produk Admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage products" ON public.produk USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: proses_pengeringan Admins can manage proses_pengeringan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage proses_pengeringan" ON public.proses_pengeringan USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: konten_website Admins can manage website content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage website content" ON public.konten_website TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pengambilan_koperasi Admins can view pengambilan_koperasi; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view pengambilan_koperasi" ON public.pengambilan_koperasi FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: penjualan_petani Admins can view penjualan_petani; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view penjualan_petani" ON public.penjualan_petani FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profil_perusahaan Everyone can view company profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view company profile" ON public.profil_perusahaan FOR SELECT TO authenticated USING (true);


--
-- Name: petani Everyone can view farmers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view farmers" ON public.petani FOR SELECT USING (true);


--
-- Name: panen Everyone can view harvests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view harvests" ON public.panen FOR SELECT USING (true);


--
-- Name: label_settings Everyone can view label settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view label settings" ON public.label_settings FOR SELECT USING (true);


--
-- Name: lahan Everyone can view lands; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view lands" ON public.lahan FOR SELECT USING (true);


--
-- Name: pengepul Everyone can view pengepul; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view pengepul" ON public.pengepul FOR SELECT USING (true);


--
-- Name: produk Everyone can view products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view products" ON public.produk FOR SELECT USING (true);


--
-- Name: konten_website Everyone can view website content; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view website content" ON public.konten_website FOR SELECT USING (true);


--
-- Name: batch_panen Only admins can view batch_panen; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view batch_panen" ON public.batch_panen FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: estimasi_panen Only admins can view estimasi_panen; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view estimasi_panen" ON public.estimasi_panen FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: gudang_stok Only admins can view gudang_stok; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view gudang_stok" ON public.gudang_stok FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pengolahan_dokumen Only admins can view pengolahan_dokumen; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view pengolahan_dokumen" ON public.pengolahan_dokumen FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: penjualan Only admins can view penjualan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view penjualan" ON public.penjualan FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: proses_pengeringan Only admins can view proses_pengeringan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can view proses_pengeringan" ON public.proses_pengeringan FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: batch_panen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.batch_panen ENABLE ROW LEVEL SECURITY;

--
-- Name: estimasi_panen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estimasi_panen ENABLE ROW LEVEL SECURITY;

--
-- Name: gudang_stok; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gudang_stok ENABLE ROW LEVEL SECURITY;

--
-- Name: konten_website; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.konten_website ENABLE ROW LEVEL SECURITY;

--
-- Name: label_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.label_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: lahan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lahan ENABLE ROW LEVEL SECURITY;

--
-- Name: panen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.panen ENABLE ROW LEVEL SECURITY;

--
-- Name: pengambilan_koperasi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pengambilan_koperasi ENABLE ROW LEVEL SECURITY;

--
-- Name: pengepul; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pengepul ENABLE ROW LEVEL SECURITY;

--
-- Name: pengolahan_dokumen; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pengolahan_dokumen ENABLE ROW LEVEL SECURITY;

--
-- Name: penjualan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.penjualan ENABLE ROW LEVEL SECURITY;

--
-- Name: penjualan_petani; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.penjualan_petani ENABLE ROW LEVEL SECURITY;

--
-- Name: petani; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.petani ENABLE ROW LEVEL SECURITY;

--
-- Name: produk; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produk ENABLE ROW LEVEL SECURITY;

--
-- Name: profil_perusahaan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profil_perusahaan ENABLE ROW LEVEL SECURITY;

--
-- Name: proses_pengeringan; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proses_pengeringan ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


