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
      konten_website: {
        Row: {
          created_at: string
          gambar_url: string | null
          id: string
          isi: string | null
          judul: string | null
          section: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gambar_url?: string | null
          id?: string
          isi?: string | null
          judul?: string | null
          section: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gambar_url?: string | null
          id?: string
          isi?: string | null
          judul?: string | null
          section?: string
          updated_at?: string
        }
        Relationships: []
      }
      label_settings: {
        Row: {
          cor_nop_certified: boolean
          created_at: string
          eu_certified: boolean
          id: string
          is_organic: boolean
          petani_id: string
          sni_certified: boolean
          updated_at: string
        }
        Insert: {
          cor_nop_certified?: boolean
          created_at?: string
          eu_certified?: boolean
          id?: string
          is_organic?: boolean
          petani_id: string
          sni_certified?: boolean
          updated_at?: string
        }
        Update: {
          cor_nop_certified?: boolean
          created_at?: string
          eu_certified?: boolean
          id?: string
          is_organic?: boolean
          petani_id?: string
          sni_certified?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_settings_petani_id_fkey"
            columns: ["petani_id"]
            isOneToOne: true
            referencedRelation: "petani"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "label_settings_petani_id_fkey"
            columns: ["petani_id"]
            isOneToOne: true
            referencedRelation: "petani_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lahan: {
        Row: {
          created_at: string
          id: string
          keterangan: string | null
          kode_lahan: string
          petani_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          keterangan?: string | null
          kode_lahan: string
          petani_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          keterangan?: string | null
          kode_lahan?: string
          petani_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lahan_petani_id_fkey"
            columns: ["petani_id"]
            isOneToOne: false
            referencedRelation: "petani"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lahan_petani_id_fkey"
            columns: ["petani_id"]
            isOneToOne: false
            referencedRelation: "petani_public"
            referencedColumns: ["id"]
          },
        ]
      }
      panen: {
        Row: {
          created_at: string
          id: string
          jumlah_kg: number
          keterangan: string | null
          lahan_id: string
          tanggal_panen: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jumlah_kg: number
          keterangan?: string | null
          lahan_id: string
          tanggal_panen: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jumlah_kg?: number
          keterangan?: string | null
          lahan_id?: string
          tanggal_panen?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "panen_lahan_id_fkey"
            columns: ["lahan_id"]
            isOneToOne: false
            referencedRelation: "lahan"
            referencedColumns: ["id"]
          },
        ]
      }
      petani: {
        Row: {
          alamat: string
          created_at: string
          id: string
          kode_petani: string
          nama: string
          no_telepon: string | null
          rata_rata_panen: number | null
          updated_at: string
        }
        Insert: {
          alamat: string
          created_at?: string
          id?: string
          kode_petani: string
          nama: string
          no_telepon?: string | null
          rata_rata_panen?: number | null
          updated_at?: string
        }
        Update: {
          alamat?: string
          created_at?: string
          id?: string
          kode_petani?: string
          nama?: string
          no_telepon?: string | null
          rata_rata_panen?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      produk: {
        Row: {
          created_at: string
          deskripsi: string | null
          gambar_url: string | null
          harga: number
          id: string
          nama: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deskripsi?: string | null
          gambar_url?: string | null
          harga: number
          id?: string
          nama: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deskripsi?: string | null
          gambar_url?: string | null
          harga?: number
          id?: string
          nama?: string
          updated_at?: string
        }
        Relationships: []
      }
      profil_perusahaan: {
        Row: {
          alamat: string | null
          created_at: string
          deskripsi: string | null
          id: string
          kontak: string | null
          label_background_end: string | null
          label_background_start: string | null
          label_font_family: string | null
          label_primary_color: string | null
          logo_url: string | null
          nama_perusahaan: string
          qr_error_correction: string | null
          qr_logo_size: number | null
          qr_logo_url: string | null
          qr_size: number | null
          updated_at: string
        }
        Insert: {
          alamat?: string | null
          created_at?: string
          deskripsi?: string | null
          id?: string
          kontak?: string | null
          label_background_end?: string | null
          label_background_start?: string | null
          label_font_family?: string | null
          label_primary_color?: string | null
          logo_url?: string | null
          nama_perusahaan: string
          qr_error_correction?: string | null
          qr_logo_size?: number | null
          qr_logo_url?: string | null
          qr_size?: number | null
          updated_at?: string
        }
        Update: {
          alamat?: string | null
          created_at?: string
          deskripsi?: string | null
          id?: string
          kontak?: string | null
          label_background_end?: string | null
          label_background_start?: string | null
          label_font_family?: string | null
          label_primary_color?: string | null
          logo_url?: string | null
          nama_perusahaan?: string
          qr_error_correction?: string | null
          qr_logo_size?: number | null
          qr_logo_url?: string | null
          qr_size?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      petani_public: {
        Row: {
          alamat: string | null
          created_at: string | null
          id: string | null
          kode_petani: string | null
          nama: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          id?: string | null
          kode_petani?: string | null
          nama?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          id?: string | null
          kode_petani?: string | null
          nama?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
