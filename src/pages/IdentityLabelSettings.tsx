import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { FarmerIdentityLabel } from "@/components/FarmerIdentityLabel";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const IdentityLabelSettings = () => {
  const navigate = useNavigate();
  const { profile, updateProfile, loading } = useCompanyProfile();
  
  const [primaryColor, setPrimaryColor] = useState("30 71% 42%");
  const [fontFamily, setFontFamily] = useState("Inter");
  const [settings, setSettings] = useState({
    show_company_logo: true,
    show_farmer_logo: false,
    header_text: "Member of",
    farmer_name_label: "Farmer Name",
    farmer_code_label: "Farmer Code",
    qr_text: "Scan untuk verifikasi identitas",
    card_style: "modern",
  });

  useEffect(() => {
    if (profile) {
      setPrimaryColor(profile.identity_label_primary_color || "30 71% 42%");
      setFontFamily(profile.identity_label_font_family || "Inter");
      
      if (profile.identity_label_settings) {
        const settingsData = typeof profile.identity_label_settings === 'string' 
          ? JSON.parse(profile.identity_label_settings)
          : profile.identity_label_settings;
        setSettings(prev => ({ ...prev, ...settingsData }));
      }
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile({
        identity_label_primary_color: primaryColor,
        identity_label_font_family: fontFamily,
        identity_label_settings: settings as any,
      });

      toast({
        title: "Berhasil",
        description: "Pengaturan label identitas berhasil disimpan",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan pengaturan",
        variant: "destructive",
      });
    }
  };

  const availableFonts = [
    "Inter",
    "Playfair Display",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Poppins",
    "Raleway",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/farmer-identity-labels")}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Pengaturan Label Identitas Petani</h1>
              <p className="text-muted-foreground">Kustomisasi desain dan konten label identitas</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            <Save className="h-4 w-4" />
            Simpan Pengaturan
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Kustomisasi Label</CardTitle>
              <CardDescription>Atur desain dan konten label identitas petani</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="design" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="design">Desain</TabsTrigger>
                  <TabsTrigger value="content">Konten</TabsTrigger>
                </TabsList>

                <TabsContent value="design" className="space-y-6 pt-4">
                  {/* Color Settings */}
                  <div className="space-y-3">
                    <Label>Warna Utama (HSL Format)</Label>
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="30 71% 42%"
                    />
                    <div 
                      className="h-12 rounded-lg border-2"
                      style={{ backgroundColor: `hsl(${primaryColor})` }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: hue saturation lightness (contoh: 30 71% 42%)
                    </p>
                  </div>

                  {/* Font Settings */}
                  <div className="space-y-3">
                    <Label>Font</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableFonts.map(font => (
                          <SelectItem key={font} value={font}>{font}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Visibility Settings */}
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold">Tampilkan Elemen</h4>
                    
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-company-logo">Logo Perusahaan</Label>
                      <Switch
                        id="show-company-logo"
                        checked={settings.show_company_logo}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, show_company_logo: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-farmer-logo">Logo Petani</Label>
                      <Switch
                        id="show-farmer-logo"
                        checked={settings.show_farmer_logo}
                        onCheckedChange={(checked) => 
                          setSettings(prev => ({ ...prev, show_farmer_logo: checked }))
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <Label htmlFor="header-text">Teks Header</Label>
                    <Input
                      id="header-text"
                      value={settings.header_text}
                      onChange={(e) => setSettings(prev => ({ ...prev, header_text: e.target.value }))}
                      placeholder="Member of"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="farmer-name-label">Label Nama Petani</Label>
                    <Input
                      id="farmer-name-label"
                      value={settings.farmer_name_label}
                      onChange={(e) => setSettings(prev => ({ ...prev, farmer_name_label: e.target.value }))}
                      placeholder="Farmer Name"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="farmer-code-label">Label Kode Petani</Label>
                    <Input
                      id="farmer-code-label"
                      value={settings.farmer_code_label}
                      onChange={(e) => setSettings(prev => ({ ...prev, farmer_code_label: e.target.value }))}
                      placeholder="Farmer Code"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="qr-text">Teks QR Code</Label>
                    <Input
                      id="qr-text"
                      value={settings.qr_text}
                      onChange={(e) => setSettings(prev => ({ ...prev, qr_text: e.target.value }))}
                      placeholder="Scan untuk verifikasi identitas"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Right: Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Tampilan label dengan pengaturan saat ini</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <FarmerIdentityLabel
                farmerName="Contoh Petani"
                farmerCode="PTN-001"
                farmerId="preview"
                companyName={profile?.nama_perusahaan || "Nama Perusahaan"}
                companyLogo={settings.show_company_logo ? profile?.logo_url || undefined : undefined}
                customColors={{
                  primary: primaryColor,
                  backgroundStart: profile?.label_background_start || "40 100% 97%",
                  backgroundEnd: profile?.label_background_end || "33 100% 87%",
                }}
                customFont={fontFamily}
                qrSize={profile?.qr_size || 180}
                qrErrorCorrection={profile?.qr_error_correction as 'L' | 'M' | 'Q' | 'H' || 'M'}
                qrLogo={profile?.qr_logo_url || undefined}
                qrLogoSize={profile?.qr_logo_size || 50}
                customSettings={settings}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default IdentityLabelSettings;
