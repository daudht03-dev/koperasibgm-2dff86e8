import { Leaf } from "lucide-react";
import { usePublicCompanyProfile } from "@/hooks/use-public-company-profile";

const PublicNavbar = () => {
  const { profile } = usePublicCompanyProfile();

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              {profile?.logo_url ? (
                <img 
                  src={profile.logo_url} 
                  alt={profile.nama_perusahaan || "Logo perusahaan"}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <div className="bg-gradient-organic p-2 rounded-lg shadow-gentle">
                  <Leaf className="h-6 w-6 text-primary-foreground" />
                </div>
              )}
              <span className="text-xl font-bold text-foreground">
                {profile?.nama_perusahaan || "Berkah Gendis Mandiri"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavbar;
