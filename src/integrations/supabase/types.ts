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
      petani: {
        Row: {
          alamat: string | null
          created_at: string | null
          foto_url: string | null
          id: string
          kode_petani: string
          logo_url: string | null
          nama: string
          no_telepon: string | null
          status: string | null
          tanggal_bergabung: string | null
          updated_at: string | null
        }
        Insert: {
          alamat?: string | null
          created_at?: string | null
          foto_url?: string | null
          id?: string
          kode_petani: string
          logo_url?: string | null
          nama: string
          no_telepon?: string | null
          status?: string | null
          tanggal_bergabung?: string | null
          updated_at?: string | null
        }
        Update: {
          alamat?: string | null
          created_at?: string | null
          foto_url?: string | null
          id?: string
          kode_petani?: string
          logo_url?: string | null
          nama?: string
          no_telepon?: string | null
          status?: string | null
          tanggal_bergabung?: string | null
          updated_at?: string | null
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
    },
  },
} as const
