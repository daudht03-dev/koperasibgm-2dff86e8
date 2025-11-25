import { useRef, useEffect } from "react";
import QRCode from "qrcode";
import { Checkbox } from "@/components/ui/checkbox";

interface PackagingLabelProps {
  farmerName: string;
  farmerId: string;
  euCertified: boolean;
  corNopCertified: boolean;
  sniCertified: boolean;
  isOrganic: boolean;
  companyName?: string;
  showForPrint?: boolean;
}

export const PackagingLabel = ({
  farmerName,
  farmerId,
  euCertified,
  corNopCertified,
  sniCertified,
  isOrganic,
  companyName = "Berkah Gendis Mandiri",
  showForPrint = false,
}: PackagingLabelProps) => {
  const qrCodeRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      if (qrCodeRef.current) {
        const profileUrl = `${window.location.origin}/profil-petani/${farmerId}`;
        const qrCodeDataUrl = await QRCode.toDataURL(profileUrl, {
          width: 200,
          margin: 1,
        });
        qrCodeRef.current.src = qrCodeDataUrl;
      }
    };
    generateQRCode();
  }, [farmerId]);

  return (
    <div 
      className={`bg-gradient-to-br from-amber-50 to-orange-100 border-4 border-amber-800 rounded-lg p-6 ${
        showForPrint ? 'w-[400px] h-[600px]' : 'w-full max-w-md'
      } flex flex-col justify-between shadow-xl`}
      style={{ pageBreakAfter: 'always' }}
    >
      {/* Company Name Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-amber-900 tracking-wide">
          {companyName}
        </h1>
        <div className="h-1 bg-amber-800 mt-2 mx-auto w-3/4"></div>
      </div>

      {/* Farmer Name */}
      <div className="mb-4">
        <p className="text-2xl font-semibold text-amber-900 text-center">
          {farmerName}
        </p>
      </div>

      {/* Certifications */}
      <div className="mb-6 bg-white/50 rounded-lg p-4 border-2 border-amber-600">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-2">
            <Checkbox checked={euCertified} disabled className="scale-125" />
            <span className="text-xs font-medium text-amber-900 text-center">EU</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Checkbox checked={corNopCertified} disabled className="scale-125" />
            <span className="text-xs font-medium text-amber-900 text-center">COR-NOP<br/>Equivalent</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Checkbox checked={sniCertified} disabled className="scale-125" />
            <span className="text-xs font-medium text-amber-900 text-center">SNI</span>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center mb-6">
        <div className="bg-white p-3 rounded-lg shadow-md border-2 border-amber-600">
          <img
            ref={qrCodeRef}
            alt="QR Code"
            className="w-32 h-32"
          />
        </div>
        <p className="text-sm text-amber-900 mt-2 text-center font-medium">
          Scan untuk melihat detail profil
        </p>
      </div>

      {/* Organic/Conventional Badge */}
      <div className="mt-auto">
        <div 
          className={`text-center py-3 rounded-lg font-bold text-xl tracking-widest ${
            isOrganic 
              ? 'bg-green-700 text-white' 
              : 'bg-amber-700 text-white'
          }`}
        >
          {isOrganic ? 'ORGANIK' : 'KONVENSIONAL'}
        </div>
      </div>
    </div>
  );
};
