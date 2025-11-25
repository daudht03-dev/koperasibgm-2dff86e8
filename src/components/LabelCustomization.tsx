import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { Palette, Type, Upload, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PackagingLabel } from "./PackagingLabel";
import { supabase } from "@/integrations/supabase/client";

const FONT_OPTIONS = [
  { value: "Playfair Display", label: "Playfair Display (Klasik)" },
  { value: "Lora", label: "Lora (Elegan)" },
  { value: "Merriweather", label: "Merriweather (Tradisional)" },
  { value: "Roboto", label: "Roboto (Modern)" },
  { value: "Open Sans", label: "Open Sans (Bersih)" },
  { value: "Montserrat", label: "Montserrat (Bold)" },
];

const ERROR_CORRECTION_OPTIONS = [
  { value: "L", label: "L - Low (7% koreksi)" },
  { value: "M", label: "M - Medium (15% koreksi)" },
  { value: "Q", label: "Q - Quartile (25% koreksi)" },
  { value: "H", label: "H - High (30% koreksi)" },
];

export const LabelCustomization = () => {
  const { profile, updateProfile, uploadLogo } = useCompanyProfile();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [qrLogoFile, setQrLogoFile] = useState<File | null>(null);
  const [qrLogoPreview, setQrLogoPreview] = useState<string>("");
  
  const [customSettings, setCustomSettings] = useState({
    label_primary_color: "30 71% 42%",
    label_background_start: "40 100% 97%",
    label_background_end: "33 100% 87%",
    label_font_family: "Playfair Display",
    qr_size: 200,
    qr_error_correction: "M",
    qr_logo_size: 50,
  });

  useEffect(() => {
    if (profile) {
      setCustomSettings({
        label_primary_color: profile.label_primary_color || "30 71% 42%",
        label_background_start: profile.label_background_start || "40 100% 97%",
        label_background_end: profile.label_background_end || "33 100% 87%",
        label_font_family: profile.label_font_family || "Playfair Display",
        qr_size: profile.qr_size || 200,
        qr_error_correction: profile.qr_error_correction || "M",
        qr_logo_size: profile.qr_logo_size || 50,
      });
      if (profile.logo_url) {
        setLogoPreview(profile.logo_url);
      }
      if (profile.qr_logo_url) {
        setQrLogoPreview(profile.qr_logo_url);
      }
    }
  }, [profile]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQrLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadQrLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `qr-logo.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete existing QR logo if exists
      if (profile?.qr_logo_url) {
        const existingPath = profile.qr_logo_url.split('/').pop();
        if (existingPath) {
          await supabase.storage
            .from('profil-perusahaan')
            .remove([existingPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profil-perusahaan')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profil-perusahaan')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading QR logo:', error);
      toast({
        title: "Error",
        description: "Gagal mengunggah logo QR",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSaveCustomization = async () => {
    try {
      let logoUrl = profile?.logo_url;
      let qrLogoUrl = profile?.qr_logo_url;

      // Upload logo if changed
      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Upload QR logo if changed
      if (qrLogoFile) {
        const uploadedUrl = await uploadQrLogo(qrLogoFile);
        if (uploadedUrl) {
          qrLogoUrl = uploadedUrl;
        }
      }

      await updateProfile({
        ...customSettings,
        logo_url: logoUrl,
        qr_logo_url: qrLogoUrl,
      });

      toast({
        title: "Berhasil",
        description: "Kustomisasi label berhasil disimpan",
      });
    } catch (error) {
      console.error("Error saving customization:", error);
    }
  };

  const hslToHex = (hsl: string) => {
    const [h, s, l] = hsl.split(" ").map((v, i) => {
      if (i === 0) return parseFloat(v);
      return parseFloat(v.replace("%", "")) / 100;
    });
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const r = Math.round(hue2rgb(p, q, h / 360 + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h / 360) * 255);
    const b = Math.round(hue2rgb(p, q, h / 360 - 1/3) * 255);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  };

  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Kustomisasi Label Kemasan
          </CardTitle>
          <CardDescription>
            Sesuaikan tampilan label kemasan dengan warna, font, dan logo perusahaan Anda
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Logo Perusahaan
            </Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="w-24 h-24 border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                  <img src={logoPreview} alt="Logo preview" className="max-w-full max-h-full object-contain p-2" />
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="max-w-xs"
              />
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              Font Label
            </Label>
            <Select
              value={customSettings.label_font_family}
              onValueChange={(value) =>
                setCustomSettings({ ...customSettings, label_font_family: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    <span style={{ fontFamily: font.value }}>{font.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Primary Color */}
          <div className="space-y-3">
            <Label>Warna Utama (Border & Header)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={hslToHex(customSettings.label_primary_color)}
                onChange={(e) =>
                  setCustomSettings({
                    ...customSettings,
                    label_primary_color: hexToHsl(e.target.value),
                  })
                }
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={customSettings.label_primary_color}
                onChange={(e) =>
                  setCustomSettings({ ...customSettings, label_primary_color: e.target.value })
                }
                placeholder="30 71% 42%"
                className="flex-1"
              />
            </div>
          </div>

          {/* Background Start Color */}
          <div className="space-y-3">
            <Label>Warna Latar Awal (Gradient)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={hslToHex(customSettings.label_background_start)}
                onChange={(e) =>
                  setCustomSettings({
                    ...customSettings,
                    label_background_start: hexToHsl(e.target.value),
                  })
                }
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={customSettings.label_background_start}
                onChange={(e) =>
                  setCustomSettings({ ...customSettings, label_background_start: e.target.value })
                }
                placeholder="40 100% 97%"
                className="flex-1"
              />
            </div>
          </div>

          {/* Background End Color */}
          <div className="space-y-3">
            <Label>Warna Latar Akhir (Gradient)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={hslToHex(customSettings.label_background_end)}
                onChange={(e) =>
                  setCustomSettings({
                    ...customSettings,
                    label_background_end: hexToHsl(e.target.value),
                  })
                }
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={customSettings.label_background_end}
                onChange={(e) =>
                  setCustomSettings({ ...customSettings, label_background_end: e.target.value })
                }
                placeholder="33 100% 87%"
                className="flex-1"
              />
            </div>
          </div>

          {/* QR Code Customization Section */}
          <div className="pt-6 border-t space-y-6">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Kustomisasi QR Code</h3>
            </div>

            {/* QR Size */}
            <div className="space-y-3">
              <Label>Ukuran QR Code (px)</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="range"
                  min="150"
                  max="300"
                  step="10"
                  value={customSettings.qr_size}
                  onChange={(e) =>
                    setCustomSettings({ ...customSettings, qr_size: parseInt(e.target.value) })
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="150"
                  max="300"
                  value={customSettings.qr_size}
                  onChange={(e) =>
                    setCustomSettings({ ...customSettings, qr_size: parseInt(e.target.value) || 200 })
                  }
                  className="w-20"
                />
              </div>
            </div>

            {/* Error Correction Level */}
            <div className="space-y-3">
              <Label>Level Koreksi Error</Label>
              <Select
                value={customSettings.qr_error_correction}
                onValueChange={(value) =>
                  setCustomSettings({ ...customSettings, qr_error_correction: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ERROR_CORRECTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Level lebih tinggi = QR code lebih toleran terhadap kerusakan, cocok untuk logo tertanam
              </p>
            </div>

            {/* QR Logo Upload */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Logo dalam QR Code (Opsional)
              </Label>
              <div className="flex items-center gap-4">
                {qrLogoPreview && (
                  <div className="w-16 h-16 border rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img src={qrLogoPreview} alt="QR Logo preview" className="max-w-full max-h-full object-contain p-1" />
                  </div>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleQrLogoChange}
                  className="max-w-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Logo akan ditampilkan di tengah QR code. Gunakan level koreksi error H untuk hasil terbaik.
              </p>
            </div>

            {/* QR Logo Size */}
            <div className="space-y-3">
              <Label>Ukuran Logo dalam QR (px)</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="range"
                  min="30"
                  max="80"
                  step="5"
                  value={customSettings.qr_logo_size}
                  onChange={(e) =>
                    setCustomSettings({ ...customSettings, qr_logo_size: parseInt(e.target.value) })
                  }
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="30"
                  max="80"
                  value={customSettings.qr_logo_size}
                  onChange={(e) =>
                    setCustomSettings({ ...customSettings, qr_logo_size: parseInt(e.target.value) || 50 })
                  }
                  className="w-20"
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSaveCustomization} className="w-full">
            Simpan Kustomisasi
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Preview Label</CardTitle>
          <CardDescription>Lihat pratinjau label dengan pengaturan kustomisasi Anda</CardDescription>
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
            customColors={{
              primary: customSettings.label_primary_color,
              backgroundStart: customSettings.label_background_start,
              backgroundEnd: customSettings.label_background_end,
            }}
            customFont={customSettings.label_font_family}
            customLogo={logoPreview}
            qrSize={customSettings.qr_size}
            qrErrorCorrection={customSettings.qr_error_correction as 'L' | 'M' | 'Q' | 'H'}
            qrLogo={qrLogoPreview}
            qrLogoSize={customSettings.qr_logo_size}
            showForPrint={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};
