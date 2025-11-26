import { useRef, useEffect } from "react";
import QRCode from "qrcode";
import { Checkbox } from "@/components/ui/checkbox";
import { TemplateElement } from "@/types/label";

interface PackagingLabelProps {
  farmerName: string;
  farmerCode?: string;
  farmerLogo?: string;
  farmerId: string;
  euCertified: boolean;
  corNopCertified: boolean;
  sniCertified: boolean;
  isOrganic: boolean;
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
  showForPrint?: boolean;
  templateElements?: TemplateElement[];
  customData?: Record<string, string>;
}

export const PackagingLabel = ({
  farmerName,
  farmerCode,
  farmerLogo,
  farmerId,
  euCertified,
  corNopCertified,
  sniCertified,
  isOrganic,
  companyName = "Berkah Gendis Mandiri",
  customColors,
  customFont = "Playfair Display",
  customLogo,
  qrSize = 200,
  qrErrorCorrection = 'M',
  qrLogo,
  qrLogoSize = 50,
  showForPrint = false,
  templateElements,
  customData = {},
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

  // Element renderers
  const renderElement = (element: TemplateElement) => {
    if (!element.enabled) return null;

    const elementStyles = {
      marginTop: `${element.styles?.marginTop || 0}px`,
      marginBottom: `${element.styles?.marginBottom || 0}px`,
      paddingLeft: `${(element.styles?.paddingX || 0) * 4}px`,
      paddingRight: `${(element.styles?.paddingX || 0) * 4}px`,
      paddingTop: `${(element.styles?.paddingY || 0) * 4}px`,
      paddingBottom: `${(element.styles?.paddingY || 0) * 4}px`,
    };

    switch (element.type) {
      case "company_logo":
        return customLogo ? (
          <div key={element.id} style={elementStyles} className="flex justify-center">
            <img src={customLogo} alt="Company Logo" className="h-16 w-auto object-contain" />
          </div>
        ) : null;

      case "farmer_logo":
        return farmerLogo ? (
          <div key={element.id} style={elementStyles} className="flex justify-center">
            <img src={farmerLogo} alt="Farmer Logo" className="h-12 w-auto object-contain" />
          </div>
        ) : null;

      case "company_name":
        return (
          <div key={element.id} style={elementStyles} className="text-center">
            <h1 
              className="font-bold tracking-wide"
              style={{ 
                color: `hsl(${primaryColor})`,
                fontSize: `${element.styles?.fontSize || 30}px`,
              }}
            >
              {companyName}
            </h1>
            <div 
              className="h-1 mt-2 mx-auto w-3/4"
              style={{ backgroundColor: `hsl(${primaryColor})` }}
            ></div>
          </div>
        );

      case "farmer_name":
        return (
          <div key={element.id} style={elementStyles}>
            <p 
              className="font-semibold text-center"
              style={{ 
                color: `hsl(${primaryColor})`,
                fontSize: `${element.styles?.fontSize || 24}px`,
              }}
            >
              {farmerName}
              {farmerCode && (
                <span className="font-normal opacity-80" style={{ fontSize: `${(element.styles?.fontSize || 24) * 0.7}px` }}>
                  {' '}({farmerCode})
                </span>
              )}
            </p>
          </div>
        );

      case "certifications":
        return (
          <div 
            key={element.id}
            className="bg-white/50 rounded-lg"
            style={{ 
              ...elementStyles,
              borderWidth: '2px',
              borderColor: `hsl(${primaryColor})`,
            }}
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-2">
                <Checkbox checked={euCertified} disabled className="scale-125" />
                <span 
                  className="font-medium text-center"
                  style={{ 
                    color: `hsl(${primaryColor})`,
                    fontSize: `${element.styles?.fontSize || 12}px`,
                  }}
                >
                  EU
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Checkbox checked={corNopCertified} disabled className="scale-125" />
                <span 
                  className="font-medium text-center"
                  style={{ 
                    color: `hsl(${primaryColor})`,
                    fontSize: `${element.styles?.fontSize || 12}px`,
                  }}
                >
                  COR-NOP<br/>Equivalent
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Checkbox checked={sniCertified} disabled className="scale-125" />
                <span 
                  className="font-medium text-center"
                  style={{ 
                    color: `hsl(${primaryColor})`,
                    fontSize: `${element.styles?.fontSize || 12}px`,
                  }}
                >
                  SNI
                </span>
              </div>
            </div>
          </div>
        );

      case "qr_code":
        return (
          <div key={element.id} style={elementStyles} className="flex flex-col items-center">
            <div 
              className="bg-white rounded-lg shadow-md"
              style={{ 
                borderWidth: '2px',
                borderColor: `hsl(${primaryColor})`,
                padding: `${(element.styles?.paddingY || 3) * 4}px`,
              }}
            >
              <canvas
                ref={qrCodeRef}
                className="max-w-full h-auto"
              />
            </div>
            <p 
              className="mt-2 text-center font-medium"
              style={{ 
                color: `hsl(${primaryColor})`,
                fontSize: `${element.styles?.fontSize || 14}px`,
              }}
            >
              Scan untuk melihat detail profil
            </p>
          </div>
        );

      case "organic_badge":
        return (
          <div key={element.id} style={elementStyles} className="mt-auto">
            <div 
              className={`text-center rounded-lg font-bold tracking-widest ${
                isOrganic 
                  ? 'bg-green-700 text-white' 
                  : 'bg-amber-700 text-white'
              }`}
              style={{
                fontSize: `${element.styles?.fontSize || 20}px`,
                paddingTop: `${(element.styles?.paddingY || 3) * 4}px`,
                paddingBottom: `${(element.styles?.paddingY || 3) * 4}px`,
              }}
            >
              {isOrganic ? 'ORGANIK' : 'KONVENSIONAL'}
            </div>
          </div>
        );

      case "custom_field":
        const fieldValue = element.customFieldId ? customData[element.customFieldId] : undefined;
        if (!fieldValue) return null;
        return (
          <div key={element.id} style={elementStyles}>
            <p 
              className="text-center"
              style={{ 
                color: `hsl(${primaryColor})`,
                fontSize: `${element.styles?.fontSize || 14}px`,
              }}
            >
              <span className="font-semibold">{element.label}:</span> {fieldValue}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

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
      {templateElements ? (
        templateElements.map(element => renderElement(element))
      ) : (
        <>
          {customLogo && (
            <div className="flex justify-center mb-3">
              <img src={customLogo} alt="Company Logo" className="h-16 w-auto object-contain" />
            </div>
          )}
          <div className="text-center mb-6">
            <h1 
              className="text-3xl font-bold tracking-wide"
              style={{ color: `hsl(${primaryColor})` }}
            >
              {companyName}
            </h1>
            <div 
              className="h-1 mt-2 mx-auto w-3/4"
              style={{ backgroundColor: `hsl(${primaryColor})` }}
            ></div>
          </div>
          <div className="mb-4">
            <p 
              className="text-2xl font-semibold text-center"
              style={{ color: `hsl(${primaryColor})` }}
            >
              {farmerName}
              {farmerCode && (
                <span className="text-lg font-normal opacity-80">
                  {' '}({farmerCode})
                </span>
              )}
            </p>
          </div>
          <div 
            className="mb-6 bg-white/50 rounded-lg p-4"
            style={{ 
              borderWidth: '2px',
              borderColor: `hsl(${primaryColor})`,
            }}
          >
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center gap-2">
                <Checkbox checked={euCertified} disabled className="scale-125" />
                <span 
                  className="text-xs font-medium text-center"
                  style={{ color: `hsl(${primaryColor})` }}
                >
                  EU
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Checkbox checked={corNopCertified} disabled className="scale-125" />
                <span 
                  className="text-xs font-medium text-center"
                  style={{ color: `hsl(${primaryColor})` }}
                >
                  COR-NOP<br/>Equivalent
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Checkbox checked={sniCertified} disabled className="scale-125" />
                <span 
                  className="text-xs font-medium text-center"
                  style={{ color: `hsl(${primaryColor})` }}
                >
                  SNI
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center mb-6">
            <div 
              className="bg-white p-3 rounded-lg shadow-md"
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
              className="text-sm mt-2 text-center font-medium"
              style={{ color: `hsl(${primaryColor})` }}
            >
              Scan untuk melihat detail profil
            </p>
          </div>
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
        </>
      )}
    </div>
  );
};
