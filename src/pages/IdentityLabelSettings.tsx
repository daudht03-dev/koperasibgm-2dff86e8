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
    sizes: {
      modern: { width: 350, height: 500, unit: "px" },
      badge: { width: 400, height: 280, unit: "px" },
      sticker: { width: 320, height: 320, unit: "px" },
    },
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

  const paperSizes = {
    A4: { width: 210, height: 297, unit: "mm", name: "A4 (210 x 297 mm)" },
    A5: { width: 148, height: 210, unit: "mm", name: "A5 (148 x 210 mm)" },
    Letter: { width: 216, height: 279, unit: "mm", name: "Letter (8.5 x 11 in)" },
    IDCard: { width: 85.6, height: 54, unit: "mm", name: "ID Card (85.6 x 54 mm)" },
  };

  const calculateGrid = (paperWidth: number, paperHeight: number, labelWidth: number, labelHeight: number) => {
    const margin = 10; // 10mm margin
    const gap = 5; // 5mm gap between labels
    
    const usableWidth = paperWidth - (2 * margin);
    const usableHeight = paperHeight - (2 * margin);
    
    const cols = Math.floor((usableWidth + gap) / (labelWidth + gap));
    const rows = Math.floor((usableHeight + gap) / (labelHeight + gap));
    
    return { cols: Math.max(1, cols), rows: Math.max(1, rows), total: Math.max(1, cols * rows) };
  };

  const getCurrentLabelSize = () => {
    const currentStyle = settings.card_style as 'modern' | 'badge' | 'sticker';
    const width = settings.sizes?.[currentStyle]?.width || 350;
    const height = settings.sizes?.[currentStyle]?.height || 500;
    // Convert px to mm (assuming 96 DPI: 1px = 0.264583mm)
    return { width: width * 0.264583, height: height * 0.264583 };
  };

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
                  {/* Template Style Selection */}
                  <div className="space-y-3">
                    <Label>Template Style</Label>
                    <Select 
                      value={settings.card_style} 
                      onValueChange={(value) => setSettings(prev => ({ ...prev, card_style: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Modern Card - Vertical professional card</SelectItem>
                        <SelectItem value="badge">Badge - Horizontal lanyard format</SelectItem>
                        <SelectItem value="sticker">Sticker - Compact circular design</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Pilih format label yang sesuai dengan kebutuhan Anda
                    </p>
                  </div>

                  {/* Color Settings */}
                  <div className="space-y-3 pt-4 border-t">
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

                  {/* Size Settings */}
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <h4 className="font-semibold mb-1">Ukuran Label</h4>
                      <p className="text-xs text-muted-foreground">
                        Sesuaikan ukuran untuk template {settings.card_style}
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="label-width">Width (px)</Label>
                        <Input
                          id="label-width"
                          type="number"
                          min="200"
                          max="1000"
                          value={settings.sizes?.[settings.card_style as 'modern' | 'badge' | 'sticker']?.width || 350}
                          onChange={(e) => {
                            const currentStyle = settings.card_style as 'modern' | 'badge' | 'sticker';
                            setSettings(prev => ({
                              ...prev,
                              sizes: {
                                ...prev.sizes,
                                [currentStyle]: {
                                  ...prev.sizes?.[currentStyle],
                                  width: parseInt(e.target.value) || 350,
                                  height: prev.sizes?.[currentStyle]?.height || 500,
                                  unit: "px"
                                }
                              }
                            }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="label-height">Height (px)</Label>
                        <Input
                          id="label-height"
                          type="number"
                          min="200"
                          max="1000"
                          value={settings.sizes?.[settings.card_style as 'modern' | 'badge' | 'sticker']?.height || 500}
                          onChange={(e) => {
                            const currentStyle = settings.card_style as 'modern' | 'badge' | 'sticker';
                            setSettings(prev => ({
                              ...prev,
                              sizes: {
                                ...prev.sizes,
                                [currentStyle]: {
                                  ...prev.sizes?.[currentStyle],
                                  width: prev.sizes?.[currentStyle]?.width || 350,
                                  height: parseInt(e.target.value) || 500,
                                  unit: "px"
                                }
                              }
                            }));
                          }}
                        />
                      </div>
                    </div>
                    
                    {/* Preset sizes */}
                    <div className="space-y-2">
                      <Label className="text-xs">Ukuran Preset</Label>
                      <div className="flex gap-2 flex-wrap">
                        {settings.card_style === "modern" && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                sizes: { ...prev.sizes, modern: { width: 350, height: 500, unit: "px" } }
                              }))}
                            >
                              Default (350x500)
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                sizes: { ...prev.sizes, modern: { width: 300, height: 450, unit: "px" } }
                              }))}
                            >
                              Small (300x450)
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                sizes: { ...prev.sizes, modern: { width: 400, height: 600, unit: "px" } }
                              }))}
                            >
                              Large (400x600)
                            </Button>
                          </>
                        )}
                        {settings.card_style === "badge" && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                sizes: { ...prev.sizes, badge: { width: 400, height: 280, unit: "px" } }
                              }))}
                            >
                              Default (400x280)
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                sizes: { ...prev.sizes, badge: { width: 350, height: 240, unit: "px" } }
                              }))}
                            >
                              Small (350x240)
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                sizes: { ...prev.sizes, badge: { width: 500, height: 320, unit: "px" } }
                              }))}
                            >
                              Large (500x320)
                            </Button>
                          </>
                        )}
                        {settings.card_style === "sticker" && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                sizes: { ...prev.sizes, sticker: { width: 320, height: 320, unit: "px" } }
                              }))}
                            >
                              Default (320x320)
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                sizes: { ...prev.sizes, sticker: { width: 250, height: 250, unit: "px" } }
                              }))}
                            >
                              Small (250x250)
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSettings(prev => ({
                                ...prev,
                                sizes: { ...prev.sizes, sticker: { width: 400, height: 400, unit: "px" } }
                              }))}
                            >
                              Large (400x400)
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Paper Size Presets */}
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <h4 className="font-semibold mb-1">Ukuran Kertas Standar</h4>
                      <p className="text-xs text-muted-foreground">
                        Hitung otomatis berapa label yang muat di setiap kertas
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      {Object.entries(paperSizes).map(([key, paper]) => {
                        const labelSize = getCurrentLabelSize();
                        const grid = calculateGrid(paper.width, paper.height, labelSize.width, labelSize.height);
                        
                        return (
                          <div key={key} className="p-3 border rounded-lg bg-muted/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{paper.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {paper.width} x {paper.height} {paper.unit}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-primary">{grid.total}</p>
                                <p className="text-xs text-muted-foreground">label/sheet</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 border-2 border-primary rounded" />
                                <span>{grid.cols} kolom</span>
                              </div>
                              <span>×</span>
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 border-2 border-primary rounded" />
                                <span>{grid.rows} baris</span>
                              </div>
                            </div>
                            {/* Visual grid preview */}
                            <div className="flex justify-center pt-2">
                              <div 
                                className="grid gap-0.5 p-2 border-2 border-dashed border-muted-foreground/30 rounded bg-background"
                                style={{
                                  gridTemplateColumns: `repeat(${Math.min(grid.cols, 6)}, 1fr)`,
                                  maxWidth: '200px'
                                }}
                              >
                                {Array.from({ length: Math.min(grid.total, grid.cols * Math.min(grid.rows, 4)) }).map((_, i) => (
                                  <div 
                                    key={i} 
                                    className="w-4 h-6 bg-primary/20 border border-primary/40 rounded-sm"
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
