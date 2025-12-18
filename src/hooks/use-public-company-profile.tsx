import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PublicCompanyProfile = {
  id: string;
  nama_perusahaan: string | null;
  logo_url: string | null;
  updated_at: string | null;
};

const QUERY_KEY = ["public-company-profile"];

const fetchPublicCompanyProfile = async (): Promise<PublicCompanyProfile | null> => {
  const { data, error } = await supabase.functions.invoke("public-company-profile");
  if (error) throw error;

  const profile = (data?.profile ?? null) as PublicCompanyProfile | null;
  if (!profile?.logo_url) return profile;

  const version = profile.updated_at || "0";
  const sep = profile.logo_url.includes("?") ? "&" : "?";

  return {
    ...profile,
    logo_url: `${profile.logo_url}${sep}v=${encodeURIComponent(version)}`,
  };
};

export const usePublicCompanyProfile = () => {
  const { data: profile, isLoading: loading, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchPublicCompanyProfile,
    staleTime: 1000 * 60 * 5,
  });

  return {
    profile: profile ?? null,
    loading,
    fetchProfile: refetch,
  };
};
