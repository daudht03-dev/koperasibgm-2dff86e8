import { useRef, useEffect } from "react";
import QRCode from "qrcode";

interface IdentityLabelSettings {
  show_company_logo?: boolean;
  show_farmer_logo?: boolean;
  header_text?: string;
  farmer_name_label?: string;
  farmer_code_label?: string;
  qr_text?: string;
  card_style?: string;
}

interface FarmerIdentityLabelProps {
  farmerName: string;
  farmerCode: string;
  farmerId: string;
  companyName: string;
  companyLogo?: string;
  farmerLogo?: string;
  customColors?: {
    primary: string;
    backgroundStart: string;
    backgroundEnd: string;
  };
  customFont?: string;
  qrSize?: number;
  qrErrorCorrection?: 'L' | 'M' | 'Q' | 'H';
  qrLogo?: string;
  qrLogoSize?: number;
  showForPrint?: boolean;
  customSettings?: IdentityLabelSettings;
}

export const FarmerIdentityLabel = ({
  farmerName,
  farmerCode,
  farmerId,
  companyName,
  companyLogo,
  farmerLogo,
  customColors,
  customFont = "Inter",
  qrSize = 180,
  qrErrorCorrection = 'M',
  qrLogo,
  qrLogoSize = 50,
  showForPrint = false,
  customSettings,
}: FarmerIdentityLabelProps) => {
  const qrCodeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      if (qrCodeRef.current) {
        const profileUrl = `${window.location.origin}/profil-petani/${farmerId}`;
        
        const canvas = qrCodeRef.current;
        await QRCode.toCanvas(canvas, profileUrl, {
          width: qrSize,
          margin: 1,
          errorCorrectionLevel: qrErrorCorrection,
        });

        if (qrLogo) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              const logoSize = qrLogoSize;
              const centerX = (canvas.width - logoSize) / 2;
              const centerY = (canvas.height - logoSize) / 2;
              
              ctx.fillStyle = 'white';
              ctx.fillRect(centerX - 5, centerY - 5, logoSize + 10, logoSize + 10);
              
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
  
  const settings = {
    show_company_logo: true,
    show_farmer_logo: false,
    header_text: "Member of",
    farmer_name_label: "Farmer Name",
    farmer_code_label: "Farmer Code",
    qr_text: "Scan untuk verifikasi identitas",
    card_style: "modern",
    ...customSettings,
  };

  return (
    <div 
      className={`relative overflow-hidden ${
        showForPrint ? 'w-[350px] h-[500px]' : 'w-full max-w-sm'
      }`}
      style={{ 
        pageBreakAfter: 'always',
        fontFamily: customFont,
      }}
    >
      {/* Modern card with shadow */}
      <div className="h-full bg-white rounded-2xl shadow-2xl p-8 flex flex-col justify-between relative">
        {/* Decorative corner accent */}
        <div 
          className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10"
          style={{ backgroundColor: `hsl(${primaryColor})` }}
        />
        
        {/* Company Logo and Name */}
        <div className="relative z-10 space-y-4">
          {settings.show_company_logo && companyLogo && (
            <div className="flex justify-center">
              <img 
                src={companyLogo} 
                alt="Company Logo" 
                className="h-16 w-auto object-contain"
              />
            </div>
          )}
          {settings.show_farmer_logo && farmerLogo && (
            <div className="flex justify-center">
              <img 
                src={farmerLogo} 
                alt="Farmer Logo" 
                className="h-14 w-auto object-contain rounded-full border-2"
                style={{ borderColor: `hsl(${primaryColor})` }}
              />
            </div>
          )}
          <div className="text-center">
            <p 
              className="text-sm font-medium tracking-widest uppercase"
              style={{ color: `hsl(${primaryColor})` }}
            >
              {settings.header_text}
            </p>
            <h2 
              className="text-xl font-bold mt-1"
              style={{ color: `hsl(${primaryColor})` }}
            >
              {companyName}
            </h2>
          </div>
        </div>

        {/* Divider */}
        <div 
          className="h-0.5 w-full my-6"
          style={{ 
            background: `linear-gradient(to right, transparent, hsl(${primaryColor}), transparent)` 
          }}
        />

        {/* Farmer Info */}
        <div className="relative z-10 space-y-3 text-center">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {settings.farmer_name_label}
            </p>
            <h1 
              className="text-2xl font-bold"
              style={{ color: `hsl(${primaryColor})` }}
            >
              {farmerName}
            </h1>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
              {settings.farmer_code_label}
            </p>
            <p 
              className="text-xl font-semibold tracking-wide"
              style={{ color: `hsl(${primaryColor})` }}
            >
              {farmerCode}
            </p>
          </div>
        </div>

        {/* QR Code */}
        <div className="relative z-10 flex flex-col items-center space-y-3 mt-6">
          <div className="bg-white p-3 rounded-xl shadow-lg border-2" style={{ borderColor: `hsl(${primaryColor})` }}>
            <canvas
              ref={qrCodeRef}
              className="max-w-full h-auto"
            />
          </div>
          <p 
            className="text-xs font-medium text-center"
            style={{ color: `hsl(${primaryColor})` }}
          >
            {settings.qr_text}
          </p>
        </div>

        {/* Bottom decorative accent */}
        <div 
          className="absolute bottom-0 left-0 w-24 h-24 rounded-tr-full opacity-10"
          style={{ backgroundColor: `hsl(${primaryColor})` }}
        />
      </div>
    </div>
  );
};
