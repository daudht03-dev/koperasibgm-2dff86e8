import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { supabase } from "@/integrations/supabase/client";
import { formatRupiah } from "@/lib/utils";
import type { Product } from "@/hooks/use-products";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('produk')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        setProduct(data);
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center text-muted-foreground">Memuat produk...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Produk tidak ditemukan</h1>
            <Button onClick={() => navigate('/produk')} variant="default">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Produk
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button 
            onClick={() => navigate('/produk')} 
            variant="ghost" 
            className="mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Produk
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Image */}
            <Card className="overflow-hidden">
              {product.gambar_url ? (
                <div className="aspect-square">
                  <img 
                    src={product.gambar_url} 
                    alt={product.nama}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground">Tidak ada gambar</span>
                </div>
              )}
            </Card>

            {/* Product Info */}
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-4">{product.nama}</h1>
              
              <Badge variant="secondary" className="text-2xl font-bold py-2 px-4 mb-6">
                {formatRupiah(Number(product.harga))}
              </Badge>

              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-3">Deskripsi Produk</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {product.deskripsi || "Tidak ada deskripsi tersedia."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProductDetail;
