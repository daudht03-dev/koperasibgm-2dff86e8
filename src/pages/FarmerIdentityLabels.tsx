import { useState } from "react";
import { useFarmers } from "@/hooks/use-farmers";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  const [gridLayout, setGridLayout] = useState<"1x1" | "2x2" | "3x3" | "auto">("auto");
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

  // Calculate grid based on layout selection
  const calculateLayout = () => {
    if (gridLayout === "1x1") {
      return { cols: 1, rows: 1, width: "190mm", height: "277mm" };
    } else if (gridLayout === "2x2") {
      return { cols: 2, rows: 2, width: "92.5mm", height: "136.25mm" };
    } else if (gridLayout === "3x3") {
      return { cols: 3, rows: 3, width: "60mm", height: "89mm" };
    } else {
      // Auto layout for small labels (4x6 grid)
      return { cols: 4, rows: 6, width: "45mm", height: "44mm" };
    }
  };

  const layout = calculateLayout();
  const labelsPerPage = layout.cols * layout.rows;

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
            onClick={() => navigate("/admin/identity-label-settings")}
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

              {/* Layout Selection */}
              <div className="pt-4 border-t space-y-3">
                <Label className="text-sm font-semibold">Layout Grid (A4)</Label>
                <RadioGroup
                  value={gridLayout}
                  onValueChange={(value) => setGridLayout(value as "1x1" | "2x2" | "3x3" | "auto")}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1x1" id="1x1" />
                    <Label htmlFor="1x1" className="cursor-pointer text-xs">1×1 Full</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2x2" id="2x2" />
                    <Label htmlFor="2x2" className="cursor-pointer text-xs">2×2 (4)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="3x3" id="3x3" />
                    <Label htmlFor="3x3" className="cursor-pointer text-xs">3×3 (9)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="auto" />
                    <Label htmlFor="auto" className="cursor-pointer text-xs">4×6 (24)</Label>
                  </div>
                </RadioGroup>
              </div>

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

      {/* Hidden print content - using visibility:hidden + position:absolute so html2canvas can render */}
      <div 
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: 0,
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div ref={printRef} style={{ background: 'white' }}>
          <style>
            {`
              @page {
                size: A4;
                margin: 10mm;
              }
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .print-page {
                  page-break-after: always;
                  width: 210mm;
                  height: 297mm;
                  padding: 10mm;
                  position: relative;
                }
                .print-page:last-child {
                  page-break-after: auto;
                }
                .label-grid {
                  display: grid;
                  grid-template-columns: repeat(${layout.cols}, ${layout.width});
                  gap: ${layout.cols === 1 ? '0mm' : '5mm'};
                  width: fit-content;
                }
                .label-item {
                  width: ${layout.width};
                  height: ${layout.height};
                  border: 1px dashed #ccc;
                  box-sizing: border-box;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: visible;
                  page-break-inside: avoid;
                }
                .label-item > * {
                  width: 100%;
                  height: 100%;
                  object-fit: contain;
                  transform-origin: center;
                }
              }
              @media print {
                .label-item {
                  border: none;
                }
              }
            `}
          </style>
          {(() => {
            const identitySettings = profile?.identity_label_settings 
              ? (typeof profile.identity_label_settings === 'string' 
                ? JSON.parse(profile.identity_label_settings) 
                : profile.identity_label_settings)
              : undefined;
            
            const totalPages = Math.ceil(selectedFarmersList.length / labelsPerPage);
            
            return Array.from({ length: totalPages }, (_, pageIndex) => {
              const startIdx = pageIndex * labelsPerPage;
              const endIdx = Math.min(startIdx + labelsPerPage, selectedFarmersList.length);
              const pageFarmers = selectedFarmersList.slice(startIdx, endIdx);
              
              return (
                <div key={pageIndex} className="print-page">
                  <div className="label-grid">
                    {pageFarmers.map(farmer => (
                      <div key={farmer.id} className="label-item">
                        <FarmerIdentityLabel
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
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};

export default FarmerIdentityLabels;
