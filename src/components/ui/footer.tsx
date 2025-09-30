import { Leaf, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { useProducts } from "@/hooks/use-products";
import { formatRupiah } from "@/lib/utils";

const Footer = () => {
  const { profile, loading } = useCompanyProfile();
  const { products } = useProducts();

  return (
    <footer className="bg-organic-brown text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              {profile?.logo_url ? (
                <img 
                  src={profile.logo_url} 
                  alt={profile.nama_perusahaan}
                  className="h-12 w-12 object-contain"
                />
              ) : (
                <div className="bg-organic-amber p-2 rounded-lg">
                  <Leaf className="h-6 w-6 text-organic-brown" />
                </div>
              )}
              <span className="text-xl font-bold">
                {loading ? "Loading..." : (profile?.nama_perusahaan || "Berkah Gendis Official")}
              </span>
            </div>
            <p className="text-primary-foreground/80 mb-4">
              {loading ? "Memuat..." : (profile?.deskripsi || "Produsen gula kelapa organik berkualitas tinggi yang bekerja sama langsung dengan petani lokal. Menghadirkan produk alami dan sehat untuk keluarga Indonesia.")}
            </p>
            <div className="space-y-2">
              {profile?.kontak && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{profile.kontak}</span>
                </div>
              )}
              {profile?.alamat && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">{profile.alamat}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Tautan Cepat</h3>
            <ul className="space-y-2">
              <li><a href="#about" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Tentang Kami</a></li>
              <li><a href="#products" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Produk</a></li>
              <li><a href="#farmers" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Petani Mitra</a></li>
              <li><a href="/admin" className="text-primary-foreground/80 hover:text-primary-foreground transition-colors">Admin</a></li>
            </ul>
          </div>

          {/* Products */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Produk Terbaru</h3>
            <ul className="space-y-2">
              {products.slice(0, 4).map((product) => (
                <li key={product.id}>
                  <Link 
                    to={`/produk/${product.id}`}
                    className="text-primary-foreground/80 hover:text-primary-foreground transition-colors flex justify-between items-center group"
                  >
                    <span className="line-clamp-1">{product.nama}</span>
                    <span className="text-xs ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatRupiah(Number(product.harga))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-primary-foreground/60">
            © {new Date().getFullYear()} {profile?.nama_perusahaan || "Berkah Gendis Official"}. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;