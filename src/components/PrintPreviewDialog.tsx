import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PackagingLabel } from "@/components/PackagingLabel";
import { Printer, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmers: Array<{
    id: string;
    nama: string;
    kode_petani: string;
    logo_url?: string;
    custom_data?: Record<string, string>;
    euCertified: boolean;
    corNopCertified: boolean;
    sniCertified: boolean;
    isOrganic: boolean;
  }>;
  companyName?: string;
  customColors?: {
    primary: string;
    backgroundStart: string;
    backgroundEnd: string;
  };
  customFont?: string;
  customLogo?: string;
  qrSize?: number;
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  qrLogo?: string;
  qrLogoSize?: number;
  templateElements?: any[];
}

export const PrintPreviewDialog = ({
  open,
  onOpenChange,
  farmers,
  companyName,
  customColors,
  customFont,
  customLogo,
  qrSize,
  qrErrorCorrection,
  qrLogo,
  qrLogoSize,
  templateElements,
}: PrintPreviewDialogProps) => {
  const [gridLayout, setGridLayout] = useState<"2x2" | "3x3">("2x2");
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    pageStyle: `
      @page {
        size: A4;
        margin: 10mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    try {
      toast.info("Generating PDF...");
      
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`labels-${gridLayout}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate PDF");
    }
  };

  const handleDownloadJPG = async () => {
    if (!printRef.current) return;
    
    try {
      toast.info("Generating JPG...");
      
      const canvas = await html2canvas(printRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `labels-${gridLayout}-${new Date().toISOString().split('T')[0]}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success("JPG downloaded successfully!");
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error generating JPG:', error);
      toast.error("Failed to generate JPG");
    }
  };

  const gridCols = gridLayout === "2x2" ? "grid-cols-2" : "grid-cols-3";
  const labelSize = gridLayout === "2x2" ? "w-[350px] h-[500px]" : "w-[240px] h-[360px]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Preview - Label Kemasan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Layout Selection */}
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <Label className="text-base font-semibold mb-2 block">Layout Grid</Label>
              <RadioGroup
                value={gridLayout}
                onValueChange={(value) => setGridLayout(value as "2x2" | "3x3")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2x2" id="2x2" />
                  <Label htmlFor="2x2" className="cursor-pointer">2x2 (4 label/halaman)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3x3" id="3x3" />
                  <Label htmlFor="3x3" className="cursor-pointer">3x3 (9 label/halaman)</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleDownloadJPG} size="lg" variant="outline">
                <Download className="mr-2 h-5 w-5" />
                Download JPG
              </Button>
              <Button onClick={handleDownloadPDF} size="lg" variant="outline">
                <Download className="mr-2 h-5 w-5" />
                Download PDF
              </Button>
              <Button onClick={handlePrint} size="lg">
                <Printer className="mr-2 h-5 w-5" />
                Cetak {farmers.length} Label
              </Button>
            </div>
          </div>

          {/* Print Preview */}
          <div 
            ref={printRef}
            className="bg-white p-4"
          >
            <div className={`grid ${gridCols} gap-4`}>
              {farmers.map((farmer) => (
                <div key={farmer.id} className={`${labelSize} mx-auto`}>
                  <PackagingLabel
                    farmerName={farmer.nama}
                    farmerCode={farmer.kode_petani}
                    farmerLogo={farmer.logo_url}
                    farmerId={farmer.id}
                    euCertified={farmer.euCertified}
                    corNopCertified={farmer.corNopCertified}
                    sniCertified={farmer.sniCertified}
                    isOrganic={farmer.isOrganic}
                    companyName={companyName}
                    customColors={customColors}
                    customFont={customFont}
                    customLogo={customLogo}
                    qrSize={qrSize}
                    qrErrorCorrection={qrErrorCorrection}
                    qrLogo={qrLogo}
                    qrLogoSize={qrLogoSize}
                    showForPrint={true}
                    templateElements={templateElements}
                    customData={farmer.custom_data}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
