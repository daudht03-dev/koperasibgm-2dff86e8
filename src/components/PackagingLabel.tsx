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
  customColors?: {
    primary: string;
    backgroundStart: string;
    backgroundEnd: string;
  };
  customFont?: string;
  customLogo?: string;
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
  customColors,
  customFont = "Playfair Display",
  customLogo,
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
      <div className="text-center mb-6">
        {customLogo && (
          <div className="flex justify-center mb-3">
            <img src={customLogo} alt="Company Logo" className="h-16 w-auto object-contain" />
          </div>
        )}
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

      {/* Farmer Name */}
      <div className="mb-4">
        <p 
          className="text-2xl font-semibold text-center"
          style={{ color: `hsl(${primaryColor})` }}
        >
          {farmerName}
        </p>
      </div>

      {/* Certifications */}
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

      {/* QR Code */}
      <div className="flex flex-col items-center mb-6">
        <div 
          className="bg-white p-3 rounded-lg shadow-md"
          style={{ 
            borderWidth: '2px',
            borderColor: `hsl(${primaryColor})`,
          }}
        >
          <img
            ref={qrCodeRef}
            alt="QR Code"
            className="w-32 h-32"
          />
        </div>
        <p 
          className="text-sm mt-2 text-center font-medium"
          style={{ color: `hsl(${primaryColor})` }}
        >
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
