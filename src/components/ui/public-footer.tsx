import { Leaf, Phone, MapPin } from "lucide-react";
import { usePublicCompanyProfile } from "@/hooks/use-public-company-profile";

const PublicFooter = () => {
  const { profile, loading } = usePublicCompanyProfile();

  return (
    <footer className="bg-organic-brown text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          {/* Company Info */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            {profile?.logo_url ? (
              <img 
                src={profile.logo_url} 
                alt={profile.nama_perusahaan || "Company Logo"}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <div className="bg-organic-amber p-2 rounded-lg">
                <Leaf className="h-5 w-5 text-organic-brown" />
              </div>
            )}
            <span className="text-lg font-bold">
              {loading ? "Loading..." : (profile?.nama_perusahaan || "Berkah Gendis Mandiri")}
            </span>
          </div>
          
          <p className="text-primary-foreground/80 text-sm mb-4 max-w-md mx-auto">
            {loading ? "Memuat..." : (profile?.deskripsi || "Produsen gula kelapa organik berkualitas tinggi")}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-primary-foreground/80">
            {profile?.kontak && (
              <div className="flex items-center space-x-1">
                <Phone className="h-3 w-3" />
                <span>{profile.kontak}</span>
              </div>
            )}
            {profile?.alamat && (
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span>{profile.alamat}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-6 pt-6 text-center">
          <p className="text-primary-foreground/60 text-sm">
            © {new Date().getFullYear()} {profile?.nama_perusahaan || "Berkah Gendis Mandiri"}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default PublicFooter;
