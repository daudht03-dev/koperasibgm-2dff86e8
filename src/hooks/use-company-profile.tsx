import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CompanyProfile {
  id: string;
  nama_perusahaan: string;
  deskripsi?: string;
  logo_url?: string;
  alamat?: string;
  kontak?: string;
  created_at: string;
  updated_at: string;
}

export const useCompanyProfile = () => {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profil_perusahaan')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching company profile:', error);
      toast({
        title: "Error",
        description: "Gagal memuat profil perusahaan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete existing logo if exists
      if (profile?.logo_url) {
        const existingPath = profile.logo_url.split('/').pop();
        if (existingPath) {
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

      return data.publicUrl;
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

  const updateProfile = async (profileData: Partial<Omit<CompanyProfile, 'id' | 'created_at' | 'updated_at'>>) => {
    setLoading(true);
    try {
      if (!profile) {
        // Create new profile if doesn't exist - ensure nama_perusahaan is provided
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
        setProfile(data);
      } else {
        // Update existing profile
        const { data, error } = await supabase
          .from('profil_perusahaan')
          .update(profileData)
          .eq('id', profile.id)
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
      }

      toast({
        title: "Berhasil",
        description: "Profil perusahaan berhasil diperbarui",
      });
    } catch (error) {
      console.error('Error updating company profile:', error);
      toast({
        title: "Error",
        description: "Gagal memperbarui profil perusahaan",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    loading,
    fetchProfile,
    uploadLogo,
    updateProfile,
  };
};