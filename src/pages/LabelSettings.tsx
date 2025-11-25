import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabelCustomization } from "@/components/LabelCustomization";
import { TemplateBuilder, TemplateElement } from "@/components/TemplateBuilder";
import { PackagingLabel } from "@/components/PackagingLabel";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LabelSettings() {
  const navigate = useNavigate();
  const { profile } = useCompanyProfile();
  const [previewElements, setPreviewElements] = useState<TemplateElement[]>([]);

  return (
    <div className="container mx-auto py-6">
      <Button
        onClick={() => navigate("/admin")}
        variant="ghost"
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Kembali
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left side: Customization and Builder */}
        <div className="space-y-6">
          <LabelCustomization />
          <TemplateBuilder onElementsChange={setPreviewElements} />
        </div>

        {/* Right side: Live Preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Preview Real-time</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <PackagingLabel
                farmerName="Contoh Petani"
                farmerCode="P001"
                farmerId="preview"
                euCertified={true}
                corNopCertified={true}
                sniCertified={false}
                isOrganic={true}
                companyName={profile?.nama_perusahaan || "Berkah Gendis Mandiri"}
                customColors={
                  profile?.label_primary_color
                    ? {
                        primary: profile.label_primary_color,
                        backgroundStart: profile.label_background_start || "40 100% 97%",
                        backgroundEnd: profile.label_background_end || "33 100% 87%",
                      }
                    : undefined
                }
                customFont={profile?.label_font_family}
                customLogo={profile?.logo_url || undefined}
                qrSize={profile?.qr_size || 200}
                qrErrorCorrection={(profile?.qr_error_correction as 'L' | 'M' | 'Q' | 'H') || 'M'}
                qrLogo={profile?.qr_logo_url || undefined}
                qrLogoSize={profile?.qr_logo_size || 50}
                templateElements={previewElements.length > 0 ? previewElements : undefined}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
