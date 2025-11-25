import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { Settings, Eye, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PackagingLabel } from "./PackagingLabel";

interface TemplateSettings {
  show_logo: boolean;
  show_company_name: boolean;
  show_weight: boolean;
  show_farmer_name: boolean;
  show_certifications: boolean;
  show_qr: boolean;
  show_status_badge: boolean;
  logo_size: "small" | "medium" | "large";
  qr_position: "center" | "left" | "right";
  certification_layout: "horizontal" | "vertical" | "grid";
}

const DEFAULT_SETTINGS: TemplateSettings = {
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
};

export const TemplateEditor = () => {
  const { profile, updateProfile } = useCompanyProfile();
  const [settings, setSettings] = useState<TemplateSettings>(DEFAULT_SETTINGS);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [qrLogoPreview, setQrLogoPreview] = useState<string>("");

  useEffect(() => {
    if (profile) {
      if (profile.template_settings) {
        setSettings(profile.template_settings as TemplateSettings);
      }
      if (profile.logo_url) {
        setLogoPreview(profile.logo_url);
      }
      if (profile.qr_logo_url) {
        setQrLogoPreview(profile.qr_logo_url);
      }
    }
  }, [profile]);

  const handleSaveSettings = async () => {
    try {
      await updateProfile({
        template_settings: settings as any,
      });
      toast({
        title: "Berhasil",
        description: "Pengaturan template berhasil disimpan",
      });
    } catch (error) {
      console.error("Error saving template settings:", error);
    }
  };

  const toggleSetting = (key: keyof TemplateSettings) => {
    setSettings({ ...settings, [key]: !settings[key] });
  };

  const updateSetting = (key: keyof TemplateSettings, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Editor Template Label
          </CardTitle>
          <CardDescription>
            Sesuaikan elemen mana yang ditampilkan dan bagaimana layoutnya
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visibility Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Tampilkan Elemen</h3>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="show-logo">Logo Perusahaan</Label>
              <Switch
                id="show-logo"
                checked={settings.show_logo}
                onCheckedChange={() => toggleSetting("show_logo")}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-company">Nama Perusahaan</Label>
              <Switch
                id="show-company"
                checked={settings.show_company_name}
                onCheckedChange={() => toggleSetting("show_company_name")}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-weight">Field Berat</Label>
              <Switch
                id="show-weight"
                checked={settings.show_weight}
                onCheckedChange={() => toggleSetting("show_weight")}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-farmer">Nama Petani</Label>
              <Switch
                id="show-farmer"
                checked={settings.show_farmer_name}
                onCheckedChange={() => toggleSetting("show_farmer_name")}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-cert">Sertifikasi</Label>
              <Switch
                id="show-cert"
                checked={settings.show_certifications}
                onCheckedChange={() => toggleSetting("show_certifications")}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-qr">QR Code</Label>
              <Switch
                id="show-qr"
                checked={settings.show_qr}
                onCheckedChange={() => toggleSetting("show_qr")}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-badge">Badge Organik/Konvensional</Label>
              <Switch
                id="show-badge"
                checked={settings.show_status_badge}
                onCheckedChange={() => toggleSetting("show_status_badge")}
              />
            </div>
          </div>

          {/* Layout Controls */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold">Pengaturan Layout</h3>

            {settings.show_logo && (
              <div className="space-y-2">
                <Label>Ukuran Logo</Label>
                <Select
                  value={settings.logo_size}
                  onValueChange={(value) => updateSetting("logo_size", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Kecil</SelectItem>
                    <SelectItem value="medium">Sedang</SelectItem>
                    <SelectItem value="large">Besar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {settings.show_qr && (
              <div className="space-y-2">
                <Label>Posisi QR Code</Label>
                <Select
                  value={settings.qr_position}
                  onValueChange={(value) => updateSetting("qr_position", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Kiri</SelectItem>
                    <SelectItem value="center">Tengah</SelectItem>
                    <SelectItem value="right">Kanan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {settings.show_certifications && (
              <div className="space-y-2">
                <Label>Layout Sertifikasi</Label>
                <Select
                  value={settings.certification_layout}
                  onValueChange={(value) => updateSetting("certification_layout", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="horizontal">Horizontal</SelectItem>
                    <SelectItem value="vertical">Vertikal</SelectItem>
                    <SelectItem value="grid">Grid 2x2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button onClick={handleSaveSettings} className="w-full gap-2">
            <Save className="h-4 w-4" />
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview Template
          </CardTitle>
          <CardDescription>
            Preview real-time dari pengaturan template Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <PackagingLabel
            farmerName="Contoh Petani"
            farmerId="preview"
            euCertified={true}
            corNopCertified={true}
            sniCertified={true}
            isOrganic={true}
            companyName={profile?.nama_perusahaan}
            template={profile?.label_template || "template_a"}
            templateSettings={settings}
            customColors={profile?.label_primary_color ? {
              primary: profile.label_primary_color,
              backgroundStart: profile.label_background_start || "40 100% 97%",
              backgroundEnd: profile.label_background_end || "33 100% 87%",
            } : undefined}
            customFont={profile?.label_font_family}
            customLogo={logoPreview}
            qrSize={profile?.qr_size}
            qrErrorCorrection={(profile?.qr_error_correction as 'L' | 'M' | 'Q' | 'H') || 'M'}
            qrLogo={qrLogoPreview}
            qrLogoSize={profile?.qr_logo_size}
            showForPrint={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};
