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
  const bgStart = customColors?.backgroundStart || "40 100% 97%";
  const bgEnd = customColors?.backgroundEnd || "33 100% 87%";
  
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

  // Card Style: Modern professional card (vertical)
  if (settings.card_style === "modern") {
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
        <div className="h-full bg-white rounded-2xl shadow-2xl p-8 flex flex-col justify-between relative">
          <div 
            className="absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10"
            style={{ backgroundColor: `hsl(${primaryColor})` }}
          />
          
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

          <div 
            className="h-0.5 w-full my-6"
            style={{ 
              background: `linear-gradient(to right, transparent, hsl(${primaryColor}), transparent)` 
            }}
          />

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

          <div 
            className="absolute bottom-0 left-0 w-24 h-24 rounded-tr-full opacity-10"
            style={{ backgroundColor: `hsl(${primaryColor})` }}
          />
        </div>
      </div>
    );
  }

  // Badge Style: Horizontal badge/lanyard format
  if (settings.card_style === "badge") {
    return (
      <div 
        className={`relative ${
          showForPrint ? 'w-[400px] h-[280px]' : 'w-full max-w-md'
        }`}
        style={{ 
          pageBreakAfter: 'always',
          fontFamily: customFont,
        }}
      >
        <div 
          className="h-full rounded-2xl shadow-2xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, hsl(${bgStart}), hsl(${bgEnd}))`,
          }}
        >
          {/* Header bar */}
          <div 
            className="h-16 flex items-center justify-center px-6"
            style={{ backgroundColor: `hsl(${primaryColor})` }}
          >
            <div className="flex items-center gap-4">
              {settings.show_company_logo && companyLogo && (
                <img 
                  src={companyLogo} 
                  alt="Company Logo" 
                  className="h-10 w-auto object-contain"
                />
              )}
              <div className="text-white text-center">
                <p className="text-xs uppercase tracking-wider opacity-90">{settings.header_text}</p>
                <h2 className="text-lg font-bold">{companyName}</h2>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="p-6 grid grid-cols-3 gap-4 items-center h-[calc(100%-4rem)]">
            {/* Left: Farmer info */}
            <div className="col-span-2 space-y-4">
              {settings.show_farmer_logo && farmerLogo && (
                <div className="flex justify-start">
                  <img 
                    src={farmerLogo} 
                    alt="Farmer Logo" 
                    className="h-16 w-16 object-cover rounded-full border-4"
                    style={{ borderColor: `hsl(${primaryColor})` }}
                  />
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  {settings.farmer_name_label}
                </p>
                <h1 
                  className="text-2xl font-bold mt-1"
                  style={{ color: `hsl(${primaryColor})` }}
                >
                  {farmerName}
                </h1>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                  {settings.farmer_code_label}
                </p>
                <p 
                  className="text-xl font-bold tracking-wider mt-1"
                  style={{ color: `hsl(${primaryColor})` }}
                >
                  {farmerCode}
                </p>
              </div>
            </div>

            {/* Right: QR code */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="bg-white p-2 rounded-lg shadow-md border-2" style={{ borderColor: `hsl(${primaryColor})` }}>
                <canvas
                  ref={qrCodeRef}
                  className="max-w-full h-auto"
                />
              </div>
              <p 
                className="text-[10px] font-medium text-center leading-tight"
                style={{ color: `hsl(${primaryColor})` }}
              >
                {settings.qr_text}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sticker Style: Compact rounded sticker
  if (settings.card_style === "sticker") {
    return (
      <div 
        className={`relative ${
          showForPrint ? 'w-[320px] h-[320px]' : 'w-full max-w-xs'
        }`}
        style={{ 
          pageBreakAfter: 'always',
          fontFamily: customFont,
        }}
      >
        <div 
          className="h-full rounded-full shadow-2xl p-6 flex flex-col items-center justify-center relative"
          style={{
            background: `radial-gradient(circle, hsl(${bgStart}), hsl(${bgEnd}))`,
          }}
        >
          {/* Decorative circles */}
          <div 
            className="absolute inset-0 rounded-full border-8 opacity-20"
            style={{ borderColor: `hsl(${primaryColor})` }}
          />
          <div 
            className="absolute inset-4 rounded-full border-4 opacity-30"
            style={{ borderColor: `hsl(${primaryColor})` }}
          />

          <div className="relative z-10 space-y-3 text-center">
            {settings.show_company_logo && companyLogo && (
              <div className="flex justify-center mb-2">
                <img 
                  src={companyLogo} 
                  alt="Company Logo" 
                  className="h-12 w-auto object-contain"
                />
              </div>
            )}
            
            <div>
              <p 
                className="text-[10px] font-semibold tracking-widest uppercase"
                style={{ color: `hsl(${primaryColor})` }}
              >
                {settings.header_text}
              </p>
              <h2 
                className="text-sm font-bold"
                style={{ color: `hsl(${primaryColor})` }}
              >
                {companyName}
              </h2>
            </div>

            {settings.show_farmer_logo && farmerLogo && (
              <div className="flex justify-center py-2">
                <img 
                  src={farmerLogo} 
                  alt="Farmer Logo" 
                  className="h-12 w-12 object-cover rounded-full border-2"
                  style={{ borderColor: `hsl(${primaryColor})` }}
                />
              </div>
            )}

            <div className="py-2">
              <h1 
                className="text-lg font-bold"
                style={{ color: `hsl(${primaryColor})` }}
              >
                {farmerName}
              </h1>
              <p 
                className="text-sm font-semibold tracking-wider mt-1"
                style={{ color: `hsl(${primaryColor})` }}
              >
                {farmerCode}
              </p>
            </div>

            <div className="flex justify-center pt-2">
              <div className="bg-white p-2 rounded-lg shadow-md">
                <canvas
                  ref={qrCodeRef}
                  className="max-w-full h-auto"
                  style={{ width: '120px', height: '120px' }}
                />
              </div>
            </div>

            <p 
              className="text-[9px] font-medium px-4"
              style={{ color: `hsl(${primaryColor})` }}
            >
              {settings.qr_text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default fallback to modern
  return null;
};
