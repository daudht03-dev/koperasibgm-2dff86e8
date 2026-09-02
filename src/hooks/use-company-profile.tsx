import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CompanyProfile {
  id: string;
  nama_perusahaan: string;
  deskripsi?: string;
  logo_url?: string;
  alamat?: string;
  kontak?: string;
  production_url?: string;
  label_primary_color?: string;
  label_background_start?: string;
  label_background_end?: string;
  label_font_family?: string;
  label_template?: string;
  qr_size?: number;
  qr_error_correction?: string;
  qr_logo_url?: string;
  qr_logo_size?: number;
  template_settings?: any;
  custom_fields?: any;
  identity_label_primary_color?: string;
  identity_label_font_family?: string;
  identity_label_settings?: any;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ['company-profile'];

const fetchCompanyProfile = async (): Promise<CompanyProfile | null> => {
  const { data, error } = await supabase
    .from('profil_perusahaan')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const useCompanyProfile = () => {
  const queryClient = useQueryClient();

  const { data: profile, isLoading: loading, refetch: fetchProfile } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchCompanyProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `logo-${timestamp}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete existing logo if exists
      if (profile?.logo_url) {
        const existingPath = profile.logo_url.split('/').pop()?.split('?')[0];
        if (existingPath && existingPath !== fileName) {
          await supabase.storage
            .from('profil-perusahaan')
            .remove([existingPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profil-perusahaan')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profil-perusahaan')
        .getPublicUrl(filePath);

      // Add cache-busting timestamp
      return `${data.publicUrl}?t=${timestamp}`;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Gagal mengunggah logo",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<Omit<CompanyProfile, 'id' | 'created_at' | 'updated_at'>>) => {
      if (!profile) {
        // Create new profile if doesn't exist
        const createData = {
          nama_perusahaan: profileData.nama_perusahaan || 'Berkah Gendis Mandiri',
          deskripsi: profileData.deskripsi,
          logo_url: profileData.logo_url,
          alamat: profileData.alamat,
          kontak: profileData.kontak,
        };
        
        const { data, error } = await supabase
          .from('profil_perusahaan')
          .insert([createData])
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Update existing profile
        const { data, error } = await supabase
          .from('profil_perusahaan')
          .update(profileData)
          .eq('id', profile.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      // Update cache immediately
      queryClient.setQueryData(QUERY_KEY, data);
      toast({
        title: "Berhasil",
        description: "Profil perusahaan berhasil diperbarui",
      });
    },
    onError: (error) => {
      console.error('Error updating company profile:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui profil perusahaan",
        variant: "destructive",
      });
    },
  });

  const updateProfile = async (profileData: Partial<Omit<CompanyProfile, 'id' | 'created_at' | 'updated_at'>>) => {
    return updateProfileMutation.mutateAsync(profileData);
  };

  return {
    profile: profile ?? null,
    loading: loading || updateProfileMutation.isPending,
    fetchProfile,
    uploadLogo,
    updateProfile,
  };
};
