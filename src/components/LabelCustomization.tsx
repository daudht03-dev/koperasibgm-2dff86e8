import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { Palette, Type, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PackagingLabel } from "./PackagingLabel";

const FONT_OPTIONS = [
  { value: "Playfair Display", label: "Playfair Display (Klasik)" },
  { value: "Lora", label: "Lora (Elegan)" },
  { value: "Merriweather", label: "Merriweather (Tradisional)" },
  { value: "Roboto", label: "Roboto (Modern)" },
  { value: "Open Sans", label: "Open Sans (Bersih)" },
  { value: "Montserrat", label: "Montserrat (Bold)" },
];

export const LabelCustomization = () => {
  const { profile, updateProfile, uploadLogo } = useCompanyProfile();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  
  const [customSettings, setCustomSettings] = useState({
    label_primary_color: "30 71% 42%",
    label_background_start: "40 100% 97%",
    label_background_end: "33 100% 87%",
    label_font_family: "Playfair Display",
  });

  useEffect(() => {
    if (profile) {
      setCustomSettings({
        label_primary_color: profile.label_primary_color || "30 71% 42%",
        label_background_start: profile.label_background_start || "40 100% 97%",
        label_background_end: profile.label_background_end || "33 100% 87%",
        label_font_family: profile.label_font_family || "Playfair Display",
      });
      if (profile.logo_url) {
        setLogoPreview(profile.logo_url);
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

  const handleSaveCustomization = async () => {
    try {
      let logoUrl = profile?.logo_url;

      // Upload logo if changed
      if (logoFile) {
        const uploadedUrl = await uploadLogo(logoFile);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      await updateProfile({
        ...customSettings,
        logo_url: logoUrl,
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
            showForPrint={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};
