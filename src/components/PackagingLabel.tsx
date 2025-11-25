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
  weight?: number;
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
  weight,
  customColors,
  customFont = "Playfair Display",
  customLogo,
  qrSize = 200,
  qrErrorCorrection = 'M',
  qrLogo,
  qrLogoSize = 50,
  showForPrint = false,
}: PackagingLabelProps) => {
  const qrCodeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      if (qrCodeRef.current) {
        const profileUrl = `${window.location.origin}/profil-petani/${farmerId}`;
        
        // Generate QR code on canvas
        const canvas = qrCodeRef.current;
        await QRCode.toCanvas(canvas, profileUrl, {
          width: qrSize,
          margin: 1,
          errorCorrectionLevel: qrErrorCorrection,
        });

        // If logo is provided, overlay it on the QR code
        if (qrLogo) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const logoSize = qrLogoSize;
              const centerX = (canvas.width - logoSize) / 2;
              const centerY = (canvas.height - logoSize) / 2;
              
              // Draw white background for logo
              ctx.fillStyle = 'white';
              ctx.fillRect(centerX - 5, centerY - 5, logoSize + 10, logoSize + 10);
              
              // Draw logo
              ctx.drawImage(img, centerX, centerY, logoSize, logoSize);
            };
            img.src = qrLogo;
          }
        }
      }
    };
    generateQRCode();
  }, [farmerId, qrSize, qrErrorCorrection, qrLogo, qrLogoSize]);

  const primaryColor = customColors?.primary || "30 71% 42%";
  const bgStart = customColors?.backgroundStart || "40 100% 97%";
  const bgEnd = customColors?.backgroundEnd || "33 100% 87%";

  return (
    <div 
      className={`rounded-lg p-6 ${
        showForPrint ? 'w-[400px] h-[600px]' : 'w-full max-w-md'
      } flex flex-col justify-between shadow-xl`}
      style={{ 
        pageBreakAfter: 'always',
        background: `linear-gradient(to bottom right, hsl(${bgStart}), hsl(${bgEnd}))`,
        borderWidth: '4px',
        borderColor: `hsl(${primaryColor})`,
        fontFamily: customFont,
      }}
    >
      {/* Company Logo & Name Header */}
      <div className="text-center mb-4">
        {customLogo && (
          <div className="flex justify-center mb-2">
            <img src={customLogo} alt="Company Logo" className="h-12 w-auto object-contain" />
          </div>
        )}
        <h1 
          className="text-2xl font-bold tracking-wide"
          style={{ color: `hsl(${primaryColor})` }}
        >
          {companyName}
        </h1>
        <div 
          className="h-0.5 mt-1 mx-auto w-2/3"
          style={{ backgroundColor: `hsl(${primaryColor})` }}
        ></div>
      </div>

      {/* Weight Field */}
      <div className="mb-4">
        <div className="flex items-center justify-center gap-2">
          <span 
            className="text-lg font-semibold"
            style={{ color: `hsl(${primaryColor})` }}
          >
            Berat :
          </span>
          <div className="flex items-center gap-1">
            <div 
              className="border-b-2 w-16 text-center font-semibold"
              style={{ borderColor: `hsl(${primaryColor})`, color: `hsl(${primaryColor})` }}
            >
              {weight || '___'}
            </div>
            <span 
              className="text-lg font-semibold"
              style={{ color: `hsl(${primaryColor})` }}
            >
              Kg
            </span>
          </div>
        </div>
      </div>

      {/* Farmer Name */}
      <div className="mb-4">
        <p 
          className="text-xl font-semibold text-center"
          style={{ color: `hsl(${primaryColor})` }}
        >
          {farmerName}
        </p>
      </div>

      {/* Certifications */}
      <div 
        className="mb-4 bg-white/50 rounded-lg p-3"
        style={{ 
          borderWidth: '2px',
          borderColor: `hsl(${primaryColor})`,
        }}
      >
        <div className="flex justify-center items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Checkbox checked={euCertified} disabled className="scale-110" />
            <span 
              className="text-xs font-medium"
              style={{ color: `hsl(${primaryColor})` }}
            >
              EU
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox checked={corNopCertified} disabled className="scale-110" />
            <span 
              className="text-xs font-medium"
              style={{ color: `hsl(${primaryColor})` }}
            >
              COR-NOP Equivalent
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox checked={sniCertified} disabled className="scale-110" />
            <span 
              className="text-xs font-medium"
              style={{ color: `hsl(${primaryColor})` }}
            >
              SNI
            </span>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="flex flex-col items-center mb-4">
        <div 
          className="bg-white p-2 rounded-lg shadow-md"
          style={{ 
            borderWidth: '2px',
            borderColor: `hsl(${primaryColor})`,
          }}
        >
          <canvas
            ref={qrCodeRef}
            className="max-w-full h-auto"
          />
        </div>
        <p 
          className="text-xs mt-2 text-center font-medium"
          style={{ color: `hsl(${primaryColor})` }}
        >
          Scan untuk melihat detail profil
        </p>
      </div>

      {/* Organic/Conventional Badge */}
      <div className="mt-auto">
        <div 
          className={`text-center py-2 rounded-lg font-bold text-lg tracking-widest ${
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
