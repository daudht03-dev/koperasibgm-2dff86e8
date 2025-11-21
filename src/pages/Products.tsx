import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { useProducts } from "@/hooks/use-products";
import { formatRupiah } from "@/lib/utils";
import { ProductCardSkeleton } from "@/components/ui/skeleton-templates";

const Products = () => {
  const { products, loading } = useProducts();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <section className="py-16 bg-gradient-natural">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4 text-center">
            Produk Kami
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-center">
            Gula kelapa organik premium yang diproses secara tradisional dan higienis
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} showPrice />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <Card key={product.id} className="hover:shadow-gentle transition-all duration-300 overflow-hidden group">
                  <Link to={`/produk/${product.id}`}>
                    {product.gambar_url && (
                      <div className="aspect-square overflow-hidden">
                        <img 
                          src={product.gambar_url} 
                          alt={product.nama}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <h3 className="text-xl font-semibold text-foreground mb-2">{product.nama}</h3>
                      {product.deskripsi && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{product.deskripsi}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-lg font-bold">
                          {formatRupiah(Number(product.harga))}
                        </Badge>
                        <Button variant="ghost" size="sm" className="ml-2">
                          Lihat Detail
                        </Button>
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-muted-foreground">Belum ada produk tersedia.</div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Products;
