export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      batch_panen: {
        Row: {
          batch_number: string
          created_at: string | null
          detail_petani: Json | null
          harga_per_kg: number | null
          id: string
          is_organic: boolean | null
          jumlah_kg: number
          kondisi: string | null
          kualitas: Database["public"]["Enums"]["quality_grade"] | null
          lahan_id: string | null
          pengepul_ids: string[] | null
          petani_id: string
          status: Database["public"]["Enums"]["batch_status"] | null
          tanggal_penerimaan: string
          total_harga: number | null
          updated_at: string | null
          warna_produk: string | null
        }
        Insert: {
          batch_number: string
          created_at?: string | null
          detail_petani?: Json | null
          harga_per_kg?: number | null
          id?: string
          is_organic?: boolean | null
          jumlah_kg: number
          kondisi?: string | null
          kualitas?: Database["public"]["Enums"]["quality_grade"] | null
          lahan_id?: string | null
          pengepul_ids?: string[] | null
          petani_id: string
          status?: Database["public"]["Enums"]["batch_status"] | null
          tanggal_penerimaan?: string
          total_harga?: number | null
          updated_at?: string | null
          warna_produk?: string | null
        }
        Update: {
          batch_number?: string
          created_at?: string | null
          detail_petani?: Json | null
          harga_per_kg?: number | null
          id?: string
          is_organic?: boolean | null
          jumlah_kg?: number
          kondisi?: string | null
          kualitas?: Database["public"]["Enums"]["quality_grade"] | null
          lahan_id?: string | null
          pengepul_ids?: string[] | null
          petani_id?: string
          status?: Database["public"]["Enums"]["batch_status"] | null
          tanggal_penerimaan?: string
          total_harga?: number | null
          updated_at?: string | null
          warna_produk?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_panen_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_panen_petani_id_fkey"
            columns: ["petani_id"]
            isOneToOne: false
            referencedRelation: "petani"
            referencedColumns: ["id"]
          },
        ]
      }
      estimasi_panen: {
        Row: {
          catatan: string | null
          created_at: string
          data_panen: Json
          data_penjualan: Json
          data_petani: Json
          id: string
          nama_estimasi: string
          pengaturan_petani: Json | null
          tanggal_mulai: string
          tanggal_selesai: string
          updated_at: string
        }
        Insert: {
          catatan?: string | null
          created_at?: string
          data_panen: Json
          data_penjualan: Json
          data_petani: Json
          id?: string
          nama_estimasi: string
          pengaturan_petani?: Json | null
          tanggal_mulai: string
          tanggal_selesai: string
          updated_at?: string
        }
        Update: {
          catatan?: string | null
          created_at?: string
          data_panen?: Json
          data_penjualan?: Json
          data_petani?: Json
          id?: string
          nama_estimasi?: string
          pengaturan_petani?: Json | null
          tanggal_mulai?: string
          tanggal_selesai?: string
          updated_at?: string
        }
        Relationships: []
      }
      gudang_stok: {
        Row: {
          batch_id: string
          catatan: string | null
          created_at: string | null
          id: string
          is_organic: boolean | null
          jumlah_kg: number
          kelembaban: number | null
          kondisi_penyimpanan: string | null
          lokasi_gudang: string
          rak_posisi: string | null
          status: string | null
          suhu_gudang: number | null
          tanggal_keluar: string | null
          tanggal_masuk: string
          tipe_stok: string | null
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          catatan?: string | null
          created_at?: string | null
          id?: string
          is_organic?: boolean | null
          jumlah_kg: number
          kelembaban?: number | null
          kondisi_penyimpanan?: string | null
          lokasi_gudang?: string
          rak_posisi?: string | null
          status?: string | null
          suhu_gudang?: number | null
          tanggal_keluar?: string | null
          tanggal_masuk?: string
          tipe_stok?: string | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          catatan?: string | null
          created_at?: string | null
          id?: string
          is_organic?: boolean | null
          jumlah_kg?: number
          kelembaban?: number | null
          kondisi_penyimpanan?: string | null
          lokasi_gudang?: string
          rak_posisi?: string | null
          status?: string | null
          suhu_gudang?: number | null
          tanggal_keluar?: string | null
          tanggal_masuk?: string
          tipe_stok?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gudang_stok_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_panen"
            referencedColumns: ["id"]
          },
        ]
      }
      konten_website: {
        Row: {
          aktif: boolean | null
          created_at: string | null
          gambar_url: string | null
          id: string
          judul: string | null
          konten: string | null
          section: string
          updated_at: string | null
          urutan: number | null
        }
        Insert: {
          aktif?: boolean | null
          created_at?: string | null
          gambar_url?: string | null
          id?: string
          judul?: string | null
          konten?: string | null
          section: string
          updated_at?: string | null
          urutan?: number | null
        }
        Update: {
          aktif?: boolean | null
          created_at?: string | null
          gambar_url?: string | null
          id?: string
          judul?: string | null
          konten?: string | null
          section?: string
          updated_at?: string | null
          urutan?: number | null
        }
        Relationships: []
      }
      label_settings: {
        Row: {
          background_end: string | null
          background_start: string | null
          created_at: string | null
          custom_fields: Json | null
          font_family: string | null
          id: string
          petani_id: string | null
          primary_color: string | null
          template: string | null
          updated_at: string | null
        }
        Insert: {
          background_end?: string | null
          background_start?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          font_family?: string | null
          id?: string
          petani_id?: string | null
          primary_color?: string | null
          template?: string | null
          updated_at?: string | null
        }
        Update: {
          background_end?: string | null
          background_start?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          font_family?: string | null
          id?: string
          petani_id?: string | null
          primary_color?: string | null
          template?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "label_settings_petani_id_fkey"
            columns: ["petani_id"]
            isOneToOne: true
            referencedRelation: "petani"
            referencedColumns: ["id"]
          },
        ]
      }
      lahan: {
        Row: {
          created_at: string | null
          id: string
          jenis_tanah: string | null
          koordinat: string | null
          lokasi: string | null
          luas: number | null
          nama_lahan: string
          petani_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          jenis_tanah?: string | null
          koordinat?: string | null
          lokasi?: string | null
          luas?: number | null
          nama_lahan: string
          petani_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          jenis_tanah?: string | null
          koordinat?: string | null
          lokasi?: string | null
          luas?: number | null
          nama_lahan?: string
          petani_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lahan_petani_id_fkey"
            columns: ["petani_id"]
            isOneToOne: false
            referencedRelation: "petani"
            referencedColumns: ["id"]
          },
        ]
      }
      panen: {
        Row: {
          catatan: string | null
          created_at: string | null
          id: string
          jumlah_kg: number
          kualitas: string | null
          lahan_id: string | null
          petani_id: string | null
          tanggal_panen: string
          updated_at: string | null
        }
        Insert: {
          catatan?: string | null
          created_at?: string | null
          id?: string
          jumlah_kg: number
          kualitas?: string | null
          lahan_id?: string | null
          petani_id?: string | null
          tanggal_panen: string
          updated_at?: string | null
        }
        Update: {
          catatan?: string | null
          created_at?: string | null
          id?: string
          jumlah_kg?: number
          kualitas?: string | null
          lahan_id?: string | null
          petani_id?: string | null
          tanggal_panen?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "panen_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "panen_petani_id_fkey"
            columns: ["petani_id"]
            isOneToOne: false
            referencedRelation: "petani"
            referencedColumns: ["id"]
          },
        ]
      }
      pengambilan_koperasi: {
        Row: {
          batch_id: string | null
          catatan: string | null
          created_at: string | null
          detail_petani: Json | null
          id: string
          is_organic: boolean | null
          jumlah_kg: number
          lot_number: string | null
          pengepul_id: string
          tanggal_ambil: string
          updated_at: string | null
        }
        Insert: {
          batch_id?: string | null
          catatan?: string | null
          created_at?: string | null
          detail_petani?: Json | null
          id?: string
          is_organic?: boolean | null
          jumlah_kg: number
          lot_number?: string | null
          pengepul_id: string
          tanggal_ambil?: string
          updated_at?: string | null
        }
        Update: {
          batch_id?: string | null
          catatan?: string | null
          created_at?: string | null
          detail_petani?: Json | null
          id?: string
          is_organic?: boolean | null
          jumlah_kg?: number
          lot_number?: string | null
          pengepul_id?: string
          tanggal_ambil?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pengambilan_koperasi_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_panen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pengambilan_koperasi_pengepul_id_fkey"
            columns: ["pengepul_id"]
            isOneToOne: false
            referencedRelation: "pengepul"
            referencedColumns: ["id"]
          },
        ]
      }
      pengepul: {
        Row: {
          alamat: string | null
          created_at: string | null
          harga_beli: number
          id: string
          kode_pengepul: string
          nama: string
          no_telepon: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          harga_beli?: number
          id?: string
          kode_pengepul: string
          nama: string
          no_telepon?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          harga_beli?: number
          id?: string
          kode_pengepul?: string
          nama?: string
          no_telepon?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pengolahan_dokumen: {
        Row: {
          batch_id: string
          catatan: string | null
          created_at: string | null
          file_url: string | null
          id: string
          jenis_dokumen: string
          masa_berlaku: string | null
          nomor_dokumen: string
          penerbit: string | null
          status: string | null
          tanggal_dokumen: string
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          catatan?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          jenis_dokumen: string
          masa_berlaku?: string | null
          nomor_dokumen: string
          penerbit?: string | null
          status?: string | null
          tanggal_dokumen?: string
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          catatan?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          jenis_dokumen?: string
          masa_berlaku?: string | null
          nomor_dokumen?: string
          penerbit?: string | null
          status?: string | null
          tanggal_dokumen?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pengolahan_dokumen_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_panen"
            referencedColumns: ["id"]
          },
        ]
      }
      penjualan: {
        Row: {
          alamat_pembeli: string | null
          batch_id: string
          catatan: string | null
          created_at: string | null
          harga_per_kg: number
          id: string
          jumlah_kg: number
          metode_pembayaran: string | null
          nomor_invoice: string
          pembeli: string
          status_pembayaran: string | null
          tanggal_kirim: string | null
          tanggal_penjualan: string
          total_harga: number | null
          updated_at: string | null
        }
        Insert: {
          alamat_pembeli?: string | null
          batch_id: string
          catatan?: string | null
          created_at?: string | null
          harga_per_kg: number
          id?: string
          jumlah_kg: number
          metode_pembayaran?: string | null
          nomor_invoice: string
          pembeli: string
          status_pembayaran?: string | null
          tanggal_kirim?: string | null
          tanggal_penjualan?: string
          total_harga?: number | null
          updated_at?: string | null
        }
        Update: {
          alamat_pembeli?: string | null
          batch_id?: string
          catatan?: string | null
          created_at?: string | null
          harga_per_kg?: number
          id?: string
          jumlah_kg?: number
          metode_pembayaran?: string | null
          nomor_invoice?: string
          pembeli?: string
          status_pembayaran?: string | null
          tanggal_kirim?: string | null
          tanggal_penjualan?: string
          total_harga?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "penjualan_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_panen"
            referencedColumns: ["id"]
          },
        ]
      }
      penjualan_petani: {
        Row: {
          catatan: string | null
          created_at: string | null
          harga_per_kg: number
          id: string
          is_organic: boolean | null
          jumlah_kg: number
          kualitas: string | null
          pengepul_id: string
          petani_id: string
          tanggal_jual: string
          total_harga: number | null
          updated_at: string | null
          warna_produk: string | null
        }
        Insert: {
          catatan?: string | null
          created_at?: string | null
          harga_per_kg: number
          id?: string
          is_organic?: boolean | null
          jumlah_kg: number
          kualitas?: string | null
          pengepul_id: string
          petani_id: string
          tanggal_jual?: string
          total_harga?: number | null
          updated_at?: string | null
          warna_produk?: string | null
        }
        Update: {
          catatan?: string | null
          created_at?: string | null
          harga_per_kg?: number
          id?: string
          is_organic?: boolean | null
          jumlah_kg?: number
          kualitas?: string | null
          pengepul_id?: string
          petani_id?: string
          tanggal_jual?: string
          total_harga?: number | null
          updated_at?: string | null
          warna_produk?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "penjualan_petani_pengepul_id_fkey"
            columns: ["pengepul_id"]
            isOneToOne: false
            referencedRelation: "pengepul"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "penjualan_petani_petani_id_fkey"
            columns: ["petani_id"]
            isOneToOne: false
            referencedRelation: "petani"
            referencedColumns: ["id"]
          },
        ]
      }
      petani: {
        Row: {
          alamat: string | null
          created_at: string | null
          foto_url: string | null
          id: string
          is_organic: boolean | null
          kode_petani: string
          logo_url: string | null
          nama: string
          no_telepon: string | null
          pengepul_id: string | null
          status: string | null
          tanggal_bergabung: string | null
          updated_at: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          foto_url?: string | null
          id?: string
          is_organic?: boolean | null
          kode_petani: string
          logo_url?: string | null
          nama: string
          no_telepon?: string | null
          pengepul_id?: string | null
          status?: string | null
          tanggal_bergabung?: string | null
          updated_at?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          foto_url?: string | null
          id?: string
          is_organic?: boolean | null
          kode_petani?: string
          logo_url?: string | null
          nama?: string
          no_telepon?: string | null
          pengepul_id?: string | null
          status?: string | null
          tanggal_bergabung?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "petani_pengepul_id_fkey"
            columns: ["pengepul_id"]
            isOneToOne: false
            referencedRelation: "pengepul"
            referencedColumns: ["id"]
          },
        ]
      }
      produk: {
        Row: {
          aktif: boolean | null
          created_at: string
          deskripsi: string | null
          gambar_url: string | null
          harga: number | null
          id: string
          kategori: string | null
          nama: string
          stok: number | null
          updated_at: string
        }
        Insert: {
          aktif?: boolean | null
          created_at?: string
          deskripsi?: string | null
          gambar_url?: string | null
          harga?: number | null
          id?: string
          kategori?: string | null
          nama: string
          stok?: number | null
          updated_at?: string
        }
        Update: {
          aktif?: boolean | null
          created_at?: string
          deskripsi?: string | null
          gambar_url?: string | null
          harga?: number | null
          id?: string
          kategori?: string | null
          nama?: string
          stok?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profil_perusahaan: {
        Row: {
          alamat: string | null
          created_at: string | null
          custom_fields: Json | null
          deskripsi: string | null
          id: string
          identity_label_font_family: string | null
          identity_label_primary_color: string | null
          identity_label_settings: Json | null
          kontak: string | null
          label_background_end: string | null
          label_background_start: string | null
          label_font_family: string | null
          label_primary_color: string | null
          label_template: string | null
          logo_url: string | null
          nama_perusahaan: string
          production_url: string | null
          qr_error_correction: string | null
          qr_logo_size: number | null
          qr_logo_url: string | null
          qr_size: number | null
          template_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          deskripsi?: string | null
          id?: string
          identity_label_font_family?: string | null
          identity_label_primary_color?: string | null
          identity_label_settings?: Json | null
          kontak?: string | null
          label_background_end?: string | null
          label_background_start?: string | null
          label_font_family?: string | null
          label_primary_color?: string | null
          label_template?: string | null
          logo_url?: string | null
          nama_perusahaan: string
          production_url?: string | null
          qr_error_correction?: string | null
          qr_logo_size?: number | null
          qr_logo_url?: string | null
          qr_size?: number | null
          template_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          deskripsi?: string | null
          id?: string
          identity_label_font_family?: string | null
          identity_label_primary_color?: string | null
          identity_label_settings?: Json | null
          kontak?: string | null
          label_background_end?: string | null
          label_background_start?: string | null
          label_font_family?: string | null
          label_primary_color?: string | null
          label_template?: string | null
          logo_url?: string | null
          nama_perusahaan?: string
          production_url?: string | null
          qr_error_correction?: string | null
          qr_logo_size?: number | null
          qr_logo_url?: string | null
          qr_size?: number | null
          template_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      proses_pengeringan: {
        Row: {
          batch_id: string
          catatan: string | null
          created_at: string | null
          detail_petani: Json | null
          durasi_jam: number | null
          id: string
          is_organic: boolean | null
          jumlah_kg_sebelum: number
          jumlah_kg_sesudah: number | null
          kadar_air_akhir: number | null
          kadar_air_awal: number | null
          lot_number: string | null
          operator: string | null
          penyusutan_kg: number | null
          qc_off: number | null
          status: string | null
          suhu_oven: number | null
          susut_persen: number | null
          susut_qc_off_persen: number | null
          tanggal_mulai: string
          tanggal_selesai: string | null
          total_kering: number | null
          total_kering_packing: number | null
          updated_at: string | null
        }
        Insert: {
          batch_id: string
          catatan?: string | null
          created_at?: string | null
          detail_petani?: Json | null
          durasi_jam?: number | null
          id?: string
          is_organic?: boolean | null
          jumlah_kg_sebelum: number
          jumlah_kg_sesudah?: number | null
          kadar_air_akhir?: number | null
          kadar_air_awal?: number | null
          lot_number?: string | null
          operator?: string | null
          penyusutan_kg?: number | null
          qc_off?: number | null
          status?: string | null
          suhu_oven?: number | null
          susut_persen?: number | null
          susut_qc_off_persen?: number | null
          tanggal_mulai?: string
          tanggal_selesai?: string | null
          total_kering?: number | null
          total_kering_packing?: number | null
          updated_at?: string | null
        }
        Update: {
          batch_id?: string
          catatan?: string | null
          created_at?: string | null
          detail_petani?: Json | null
          durasi_jam?: number | null
          id?: string
          is_organic?: boolean | null
          jumlah_kg_sebelum?: number
          jumlah_kg_sesudah?: number | null
          kadar_air_akhir?: number | null
          kadar_air_awal?: number | null
          lot_number?: string | null
          operator?: string | null
          penyusutan_kg?: number | null
          qc_off?: number | null
          status?: string | null
          suhu_oven?: number | null
          susut_persen?: number | null
          susut_qc_off_persen?: number | null
          tanggal_mulai?: string
          tanggal_selesai?: string | null
          total_kering?: number | null
          total_kering_packing?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proses_pengeringan_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batch_panen"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_batch_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_kode_pengepul: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      batch_status:
        | "penerimaan"
        | "pengeringan"
        | "penyimpanan"
        | "pengolahan"
        | "penjualan"
        | "selesai"
      certification_type: "organik" | "konvensional"
      quality_grade: "premium" | "grade_a" | "grade_b" | "grade_c"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      batch_status: [
        "penerimaan",
        "pengeringan",
        "penyimpanan",
        "pengolahan",
        "penjualan",
        "selesai",
      ],
      certification_type: ["organik", "konvensional"],
      quality_grade: ["premium", "grade_a", "grade_b", "grade_c"],
    },
  },
} as const
