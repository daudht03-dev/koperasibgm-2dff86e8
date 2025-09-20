import { Leaf, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-organic-brown text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="bg-organic-amber p-2 rounded-lg">
                <Leaf className="h-6 w-6 text-organic-brown" />
              </div>
              <span className="text-xl font-bold">Berkah Gendis Official</span>
            </div>
            <p className="text-primary-foreground/80 mb-4">
              Produsen gula kelapa organik berkualitas tinggi yang bekerja sama langsung dengan petani lokal. 
              Menghadirkan produk alami dan sehat untuk keluarga Indonesia.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span className="text-sm">+62 812-3456-7890</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm">info@berkahgendis.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">Yogyakarta, Indonesia</span>
              </div>
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
            <h3 className="text-lg font-semibold mb-4">Produk</h3>
            <ul className="space-y-2">
              <li className="text-primary-foreground/80">Gula Kelapa Kristal</li>
              <li className="text-primary-foreground/80">Gula Kelapa Cetak</li>
              <li className="text-primary-foreground/80">Gula Kelapa Bubuk</li>
              <li className="text-primary-foreground/80">Sirup Kelapa</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-primary-foreground/60">
            © 2024 Berkah Gendis Official. Semua hak dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;