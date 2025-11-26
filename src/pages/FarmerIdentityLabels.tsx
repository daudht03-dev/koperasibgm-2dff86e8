import { useState } from "react";
import { useFarmers } from "@/hooks/use-farmers";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Download, Printer, Search, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FarmerIdentityLabel } from "@/components/FarmerIdentityLabel";
import { useReactToPrint } from "react-to-print";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useRef } from "react";
import { toast } from "@/hooks/use-toast";

const FarmerIdentityLabels = () => {
  const navigate = useNavigate();
  const { farmers, loading } = useFarmers();
  const { profile } = useCompanyProfile();
  const [selectedFarmers, setSelectedFarmers] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const printRef = useRef<HTMLDivElement>(null);

  const filteredFarmers = farmers.filter(farmer => 
    farmer.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.kode_petani.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredFarmers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentFarmers = filteredFarmers.slice(startIndex, endIndex);

  const toggleFarmer = (farmerId: string) => {
    const newSelected = new Set(selectedFarmers);
    if (newSelected.has(farmerId)) {
      newSelected.delete(farmerId);
    } else {
      newSelected.add(farmerId);
    }
    setSelectedFarmers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedFarmers.size === currentFarmers.length) {
      setSelectedFarmers(new Set());
    } else {
      setSelectedFarmers(new Set(currentFarmers.map(f => f.id)));
    }
  };

  const selectedFarmersList = farmers.filter(f => selectedFarmers.has(f.id));

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Label Identitas Petani - ${new Date().toLocaleDateString('id-ID')}`,
  });

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    toast({
      title: "Memproses",
      description: "Sedang membuat file PDF...",
    });

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`label-identitas-petani-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Berhasil",
        description: "Label berhasil diunduh sebagai PDF",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Gagal membuat PDF",
        variant: "destructive",
      });
    }
  };

  const handleDownloadJPG = async () => {
    if (!printRef.current) return;
    
    toast({
      title: "Memproses",
      description: "Sedang membuat file JPG...",
    });

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `label-identitas-petani-${new Date().toISOString().split('T')[0]}.jpg`;
          link.click();
          URL.revokeObjectURL(url);
          
          toast({
            title: "Berhasil",
            description: "Label berhasil diunduh sebagai JPG",
          });
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error generating JPG:', error);
      toast({
        title: "Error",
        description: "Gagal membuat JPG",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-8">Memuat data...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/identity-label-settings")}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            Pengaturan Label
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Label Identitas Petani</CardTitle>
              <CardDescription>
                Pilih petani untuk mencetak label identitas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nama atau kode petani..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Select All */}
              <div className="flex items-center gap-2 py-2 border-b">
                <Checkbox
                  checked={selectedFarmers.size === currentFarmers.length && currentFarmers.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm font-medium">
                  Pilih Semua ({selectedFarmers.size} terpilih)
                </span>
              </div>

              {/* Farmer List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {currentFarmers.map(farmer => (
                  <div
                    key={farmer.id}
                    className="flex items-center gap-2 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => toggleFarmer(farmer.id)}
                  >
                    <Checkbox
                      checked={selectedFarmers.has(farmer.id)}
                      onCheckedChange={() => toggleFarmer(farmer.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{farmer.nama}</p>
                      <p className="text-sm text-muted-foreground">{farmer.kode_petani}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-4 border-t">
                <Button
                  onClick={handlePrint}
                  disabled={selectedFarmers.size === 0}
                  className="w-full gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Cetak Label ({selectedFarmers.size})
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleDownloadJPG}
                    disabled={selectedFarmers.size === 0}
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    JPG
                  </Button>
                  <Button
                    onClick={handleDownloadPDF}
                    disabled={selectedFarmers.size === 0}
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right: Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview Label</CardTitle>
              <CardDescription>
                {selectedFarmers.size > 0 
                  ? `Menampilkan ${selectedFarmers.size} label`
                  : "Pilih petani untuk melihat preview"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedFarmers.size > 0 ? (
                <div className="max-h-[600px] overflow-y-auto space-y-4">
                  {selectedFarmersList.slice(0, 3).map(farmer => {
                    const identitySettings = profile?.identity_label_settings 
                      ? (typeof profile.identity_label_settings === 'string' 
                        ? JSON.parse(profile.identity_label_settings) 
                        : profile.identity_label_settings)
                      : undefined;
                    
                    return (
                      <FarmerIdentityLabel
                        key={farmer.id}
                        farmerName={farmer.nama}
                        farmerCode={farmer.kode_petani}
                        farmerId={farmer.id}
                        companyName={profile?.nama_perusahaan || ""}
                        companyLogo={profile?.logo_url || undefined}
                        farmerLogo={farmer.logo_url || undefined}
                        customColors={{
                          primary: profile?.identity_label_primary_color || "30 71% 42%",
                          backgroundStart: profile?.label_background_start || "40 100% 97%",
                          backgroundEnd: profile?.label_background_end || "33 100% 87%",
                        }}
                        customFont={profile?.identity_label_font_family || "Inter"}
                        qrSize={profile?.qr_size || 180}
                        qrErrorCorrection={profile?.qr_error_correction as 'L' | 'M' | 'Q' | 'H' || 'M'}
                        qrLogo={profile?.qr_logo_url || undefined}
                        qrLogoSize={profile?.qr_logo_size || 50}
                        customSettings={identitySettings}
                      />
                    );
                  })}
                  {selectedFarmers.size > 3 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      ... dan {selectedFarmers.size - 3} label lainnya
                    </p>
                  )}
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Pilih petani untuk melihat preview
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden print content */}
      <div style={{ display: 'none' }}>
        <div ref={printRef} className="space-y-8 p-8">
          {selectedFarmersList.map(farmer => {
            const identitySettings = profile?.identity_label_settings 
              ? (typeof profile.identity_label_settings === 'string' 
                ? JSON.parse(profile.identity_label_settings) 
                : profile.identity_label_settings)
              : undefined;
            
            return (
              <FarmerIdentityLabel
                key={farmer.id}
                farmerName={farmer.nama}
                farmerCode={farmer.kode_petani}
                farmerId={farmer.id}
                companyName={profile?.nama_perusahaan || ""}
                companyLogo={profile?.logo_url || undefined}
                farmerLogo={farmer.logo_url || undefined}
                customColors={{
                  primary: profile?.identity_label_primary_color || "30 71% 42%",
                  backgroundStart: profile?.label_background_start || "40 100% 97%",
                  backgroundEnd: profile?.label_background_end || "33 100% 87%",
                }}
                customFont={profile?.identity_label_font_family || "Inter"}
                qrSize={profile?.qr_size || 180}
                qrErrorCorrection={profile?.qr_error_correction as 'L' | 'M' | 'Q' | 'H' || 'M'}
                qrLogo={profile?.qr_logo_url || undefined}
                qrLogoSize={profile?.qr_logo_size || 50}
                customSettings={identitySettings}
                showForPrint={true}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FarmerIdentityLabels;
