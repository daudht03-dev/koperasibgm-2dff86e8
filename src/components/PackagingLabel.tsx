import { useRef, useEffect } from "react";
import QRCode from "qrcode";
import { Checkbox } from "@/components/ui/checkbox";

interface TemplateSettings {
  show_logo?: boolean;
  show_company_name?: boolean;
  show_weight?: boolean;
  show_farmer_name?: boolean;
  show_certifications?: boolean;
  show_qr?: boolean;
  show_status_badge?: boolean;
  logo_size?: "small" | "medium" | "large";
  qr_position?: "center" | "left" | "right";
  certification_layout?: "horizontal" | "vertical" | "grid";
}

interface PackagingLabelProps {
  farmerName: string;
  farmerId: string;
  euCertified: boolean;
  corNopCertified: boolean;
  sniCertified: boolean;
  isOrganic: boolean;
  companyName?: string;
  weight?: number;
  template?: string;
  templateSettings?: TemplateSettings;
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
  template = "template_a",
  templateSettings,
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

  // Default settings if not provided
  const settings: TemplateSettings = {
    show_logo: true,
    show_company_name: true,
    show_weight: true,
    show_farmer_name: true,
    show_certifications: true,
    show_qr: true,
    show_status_badge: true,
    logo_size: "medium",
    qr_position: "center",
    certification_layout: "horizontal",
    ...templateSettings,
  };

  // Logo size mapping
  const logoSizeMap = {
    small: "h-8",
    medium: "h-12",
    large: "h-16",
  };

  // QR position alignment
  const qrAlignmentMap = {
    left: "items-start",
    center: "items-center",
    right: "items-end",
  };

  // Certification layout classes
  const certLayoutMap = {
    horizontal: "flex justify-center items-center gap-4",
    vertical: "flex flex-col items-center gap-2",
    grid: "grid grid-cols-2 gap-2",
  };

  // Template A - Klasik
  if (template === "template_a") {
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
        {(settings.show_logo || settings.show_company_name) && (
          <div className="text-center mb-4">
            {settings.show_logo && customLogo && (
              <div className="flex justify-center mb-2">
                <img 
                  src={customLogo} 
                  alt="Company Logo" 
                  className={`${logoSizeMap[settings.logo_size!]} w-auto object-contain`} 
                />
              </div>
            )}
            {settings.show_company_name && (
              <>
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
              </>
            )}
          </div>
        )}

        {/* Weight Field */}
        {settings.show_weight && (
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
        )}

        {/* Farmer Name */}
        {settings.show_farmer_name && (
          <div className="mb-4">
            <p 
              className="text-xl font-semibold text-center"
              style={{ color: `hsl(${primaryColor})` }}
            >
              {farmerName}
            </p>
          </div>
        )}

        {/* Certifications */}
        {settings.show_certifications && (
          <div 
            className="mb-4 bg-white/50 rounded-lg p-3"
            style={{ 
              borderWidth: '2px',
              borderColor: `hsl(${primaryColor})`,
            }}
          >
            <div className={certLayoutMap[settings.certification_layout!]}>
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
        )}

        {/* QR Code */}
        {settings.show_qr && (
          <div className={`flex flex-col ${qrAlignmentMap[settings.qr_position!]} mb-4`}>
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
        )}

        {/* Organic/Conventional Badge */}
        {settings.show_status_badge && (
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
        )}
      </div>
    );
  }

  // Template B - Modern
  if (template === "template_b") {
    return (
      <div 
        className={`rounded-2xl p-6 ${
          showForPrint ? 'w-[400px] h-[600px]' : 'w-full max-w-md'
        } flex flex-col shadow-2xl`}
        style={{ 
          pageBreakAfter: 'always',
          background: `hsl(${bgStart})`,
          fontFamily: customFont,
        }}
      >
        <div 
          className="rounded-xl p-4 mb-4"
          style={{ 
            background: `linear-gradient(135deg, hsl(${primaryColor}), hsl(${primaryColor} / 0.8))`,
          }}
        >
          <div className="flex items-center justify-between">
            {customLogo && (
              <img src={customLogo} alt="Company Logo" className="h-10 w-auto object-contain" />
            )}
            <h1 className="text-xl font-bold text-white flex-1 text-right">
              {companyName}
            </h1>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div 
            className="rounded-xl p-4 shadow-md"
            style={{ 
              background: 'white',
              borderLeft: `4px solid hsl(${primaryColor})`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span 
                className="text-sm font-semibold"
                style={{ color: `hsl(${primaryColor})` }}
              >
                BERAT
              </span>
              <div className="flex items-center gap-2">
                <span 
                  className="text-2xl font-bold"
                  style={{ color: `hsl(${primaryColor})` }}
                >
                  {weight || '___'}
                </span>
                <span 
                  className="text-sm font-semibold"
                  style={{ color: `hsl(${primaryColor})` }}
                >
                  KG
                </span>
              </div>
            </div>
            <div 
              className="h-px mb-3"
              style={{ backgroundColor: `hsl(${primaryColor} / 0.2)` }}
            />
            <div>
              <span 
                className="text-sm font-semibold block mb-1"
                style={{ color: `hsl(${primaryColor})` }}
              >
                PETANI
              </span>
              <span 
                className="text-lg font-bold"
                style={{ color: `hsl(${primaryColor})` }}
              >
                {farmerName}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <span 
              className="text-sm font-semibold block mb-3"
              style={{ color: `hsl(${primaryColor})` }}
            >
              SERTIFIKASI
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-1">
                <Checkbox checked={euCertified} disabled />
                <span className="text-xs font-medium" style={{ color: `hsl(${primaryColor})` }}>
                  EU
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Checkbox checked={corNopCertified} disabled />
                <span className="text-xs font-medium text-center" style={{ color: `hsl(${primaryColor})` }}>
                  COR-NOP
                </span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Checkbox checked={sniCertified} disabled />
                <span className="text-xs font-medium" style={{ color: `hsl(${primaryColor})` }}>
                  SNI
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="bg-white p-3 rounded-xl shadow-md">
              <canvas ref={qrCodeRef} className="max-w-full h-auto" />
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: `hsl(${primaryColor})` }}>
              Scan QR untuk info lengkap
            </p>
          </div>
        </div>

        <div 
          className="mt-4 text-center py-3 rounded-xl font-bold text-white uppercase tracking-wider"
          style={{ 
            background: isOrganic 
              ? 'linear-gradient(135deg, #2E7D32, #4CAF50)' 
              : 'linear-gradient(135deg, #F57C00, #FF9800)',
          }}
        >
          {isOrganic ? 'ORGANIK' : 'KONVENSIONAL'}
        </div>
      </div>
    );
  }

  // Template C - Minimalis
  return (
    <div 
      className={`${
        showForPrint ? 'w-[400px] h-[600px]' : 'w-full max-w-md'
      } flex flex-col p-8 shadow-xl`}
      style={{ 
        pageBreakAfter: 'always',
        background: 'white',
        borderTop: `8px solid hsl(${primaryColor})`,
        fontFamily: customFont,
      }}
    >
      <div className="flex items-start justify-between mb-6">
        {customLogo && (
          <img src={customLogo} alt="Company Logo" className="h-16 w-auto object-contain" />
        )}
        <div className="text-right">
          <h1 
            className="text-lg font-bold uppercase tracking-wider"
            style={{ color: `hsl(${primaryColor})` }}
          >
            {companyName}
          </h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="text-center w-full">
          <p 
            className="text-sm uppercase tracking-widest mb-2"
            style={{ color: `hsl(${primaryColor} / 0.6)` }}
          >
            Petani
          </p>
          <h2 
            className="text-3xl font-bold"
            style={{ color: `hsl(${primaryColor})` }}
          >
            {farmerName}
          </h2>
        </div>

        <div 
          className="w-full h-px"
          style={{ background: `hsl(${primaryColor} / 0.2)` }}
        />

        <div className="text-center">
          <p 
            className="text-sm uppercase tracking-widest mb-2"
            style={{ color: `hsl(${primaryColor} / 0.6)` }}
          >
            Berat
          </p>
          <div className="flex items-baseline justify-center gap-2">
            <span 
              className="text-4xl font-bold"
              style={{ color: `hsl(${primaryColor})` }}
            >
              {weight || '___'}
            </span>
            <span 
              className="text-xl font-semibold"
              style={{ color: `hsl(${primaryColor})` }}
            >
              Kg
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 pt-4">
          <div className="text-center">
            <Checkbox checked={euCertified} disabled className="mb-1" />
            <p className="text-xs" style={{ color: `hsl(${primaryColor})` }}>EU</p>
          </div>
          <div className="text-center">
            <Checkbox checked={corNopCertified} disabled className="mb-1" />
            <p className="text-xs" style={{ color: `hsl(${primaryColor})` }}>COR-NOP</p>
          </div>
          <div className="text-center">
            <Checkbox checked={sniCertified} disabled className="mb-1" />
            <p className="text-xs" style={{ color: `hsl(${primaryColor})` }}>SNI</p>
          </div>
        </div>

        <div className="flex flex-col items-center pt-4">
          <canvas ref={qrCodeRef} className="max-w-full h-auto" />
          <p 
            className="text-xs mt-3 uppercase tracking-wider"
            style={{ color: `hsl(${primaryColor} / 0.6)` }}
          >
            Scan untuk detail
          </p>
        </div>
      </div>

      <div 
        className="mt-6 text-center py-2 uppercase tracking-widest text-sm font-bold"
        style={{ 
          color: isOrganic ? '#2E7D32' : '#F57C00',
          borderTop: `2px solid ${isOrganic ? '#2E7D32' : '#F57C00'}`,
        }}
      >
        {isOrganic ? 'Organik' : 'Konvensional'}
      </div>
    </div>
  );
};
