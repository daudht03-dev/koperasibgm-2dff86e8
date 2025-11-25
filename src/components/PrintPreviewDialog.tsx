import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { PackagingLabel } from "@/components/PackagingLabel";
import { Printer } from "lucide-react";

interface PrintPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmers: Array<{
    id: string;
    nama: string;
    euCertified: boolean;
    corNopCertified: boolean;
    sniCertified: boolean;
    isOrganic: boolean;
  }>;
  companyName?: string;
}

export const PrintPreviewDialog = ({
  open,
  onOpenChange,
  farmers,
  companyName,
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
            <Button onClick={handlePrint} size="lg">
              <Printer className="mr-2 h-5 w-5" />
              Cetak {farmers.length} Label
            </Button>
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
                    farmerId={farmer.id}
                    euCertified={farmer.euCertified}
                    corNopCertified={farmer.corNopCertified}
                    sniCertified={farmer.sniCertified}
                    isOrganic={farmer.isOrganic}
                    companyName={companyName}
                    showForPrint={true}
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
