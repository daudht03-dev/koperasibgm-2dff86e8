import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Award, Leaf, Building, Save, ExternalLink, Monitor, Smartphone, Tablet, RefreshCw } from "lucide-react";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { useFarmers } from "@/hooks/use-farmers";
import { toast } from "@/hooks/use-toast";

type PublicProfileSettingsData = {
  show_certification_info: boolean;
  certification_title: string;
  certification_description: string;
  show_company_footer: boolean;
  organic_badge_text: string;
  conventional_badge_text: string;
};

const defaultSettings: PublicProfileSettingsData = {
  show_certification_info: true,
  certification_title: "Sertifikasi Organik",
  certification_description: "Petani ini mengikuti standar pertanian organik dan tidak menggunakan pestisida atau pupuk kimia sintetis",
  show_company_footer: true,
  organic_badge_text: "Petani Organik",
  conventional_badge_text: "Petani Konvensional",
};

const PublicProfileSettings = () => {
  const { profile, updateProfile, loading: profileLoading } = useCompanyProfile();
  const { farmers, loading: farmersLoading } = useFarmers();
  const [settings, setSettings] = useState<PublicProfileSettingsData>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (profile?.template_settings) {
      const saved = profile.template_settings as Record<string, unknown>;
      setSettings({
        show_certification_info: saved.show_certification_info as boolean ?? defaultSettings.show_certification_info,
        certification_title: saved.certification_title as string ?? defaultSettings.certification_title,
        certification_description: saved.certification_description as string ?? defaultSettings.certification_description,
        show_company_footer: saved.show_company_footer as boolean ?? defaultSettings.show_company_footer,
        organic_badge_text: saved.organic_badge_text as string ?? defaultSettings.organic_badge_text,
        conventional_badge_text: saved.conventional_badge_text as string ?? defaultSettings.conventional_badge_text,
      });
    }
  }, [profile]);

  useEffect(() => {
    if (farmers.length > 0 && !selectedFarmerId) {
      setSelectedFarmerId(farmers[0].id);
    }
  }, [farmers, selectedFarmerId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        template_settings: settings as unknown as Record<string, unknown>,
      });
      toast({
        title: "Berhasil",
        description: "Pengaturan profil publik berhasil disimpan",
      });
      setPreviewKey((k) => k + 1); // Refresh preview after save
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Gagal menyimpan pengaturan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getPreviewWidth = () => {
    switch (previewDevice) {
      case "mobile": return "375px";
      case "tablet": return "768px";
      default: return "100%";
    }
  };

  const selectedFarmer = farmers.find((f) => f.id === selectedFarmerId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Pengaturan Profil Petani Publik</h2>
          <p className="text-muted-foreground">
            Konfigurasi tampilan halaman profil petani saat di-scan QR code
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || profileLoading}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-organic-green" />
              Informasi Sertifikasi
            </CardTitle>
            <CardDescription>
              Pengaturan tampilan informasi sertifikasi pada profil petani
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tampilkan Info Sertifikasi</Label>
                <p className="text-sm text-muted-foreground">
                  Menampilkan bagian sertifikasi untuk petani organik
                </p>
              </div>
              <Switch
                checked={settings.show_certification_info}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, show_certification_info: checked })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="cert-title">Judul Sertifikasi</Label>
              <Input
                id="cert-title"
                value={settings.certification_title}
                onChange={(e) =>
                  setSettings({ ...settings, certification_title: e.target.value })
                }
                placeholder="Sertifikasi Organik"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-desc">Deskripsi Sertifikasi</Label>
              <Textarea
                id="cert-desc"
                value={settings.certification_description}
                onChange={(e) =>
                  setSettings({ ...settings, certification_description: e.target.value })
                }
                placeholder="Deskripsi tentang sertifikasi..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Badge Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="h-5 w-5 text-organic-green" />
              Teks Badge Status
            </CardTitle>
            <CardDescription>
              Kustomisasi teks badge untuk status petani dan lahan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organic-badge">Teks Badge Organik</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="organic-badge"
                  value={settings.organic_badge_text}
                  onChange={(e) =>
                    setSettings({ ...settings, organic_badge_text: e.target.value })
                  }
                  placeholder="Petani Organik"
                />
                <Badge variant="outline" className="border-organic-green text-organic-green whitespace-nowrap">
                  {settings.organic_badge_text || "Organik"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conv-badge">Teks Badge Konvensional</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="conv-badge"
                  value={settings.conventional_badge_text}
                  onChange={(e) =>
                    setSettings({ ...settings, conventional_badge_text: e.target.value })
                  }
                  placeholder="Petani Konvensional"
                />
                <Badge variant="outline" className="border-amber-500 text-amber-600 whitespace-nowrap">
                  {settings.conventional_badge_text || "Konvensional"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Footer Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-organic-brown" />
              Footer Perusahaan
            </CardTitle>
            <CardDescription>
              Pengaturan tampilan footer dengan informasi perusahaan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Tampilkan Footer Perusahaan</Label>
                <p className="text-sm text-muted-foreground">
                  Menampilkan logo, nama, dan kontak perusahaan di footer
                </p>
              </div>
              <Switch
                checked={settings.show_company_footer}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, show_company_footer: checked })
                }
              />
            </div>

            <Separator />

            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Data footer diambil dari Profil Perusahaan:
              </p>
              <ul className="text-sm space-y-1">
                <li>• Nama: <span className="font-medium">{profile?.nama_perusahaan || "-"}</span></li>
                <li>• Logo: <span className="font-medium">{profile?.logo_url ? "✓ Ada" : "✗ Belum diatur"}</span></li>
                <li>• Deskripsi: <span className="font-medium">{profile?.deskripsi ? "✓ Ada" : "✗ Belum diatur"}</span></li>
                <li>• Kontak: <span className="font-medium">{profile?.kontak || "-"}</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Live Preview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  Preview Langsung
                </CardTitle>
                <CardDescription>
                  Lihat tampilan profil petani seperti yang dilihat pengunjung
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedFarmerId} onValueChange={setSelectedFarmerId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Pilih petani..." />
                  </SelectTrigger>
                  <SelectContent>
                    {farmersLoading ? (
                      <SelectItem value="loading" disabled>Memuat...</SelectItem>
                    ) : farmers.length === 0 ? (
                      <SelectItem value="empty" disabled>Tidak ada petani</SelectItem>
                    ) : (
                      farmers.map((farmer) => (
                        <SelectItem key={farmer.id} value={farmer.id}>
                          {farmer.nama} ({farmer.kode_petani})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPreviewKey((k) => k + 1)}
                  title="Refresh Preview"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Device Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={previewDevice === "desktop" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewDevice("desktop")}
                >
                  <Monitor className="h-4 w-4 mr-1" />
                  Desktop
                </Button>
                <Button
                  variant={previewDevice === "tablet" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewDevice("tablet")}
                >
                  <Tablet className="h-4 w-4 mr-1" />
                  Tablet
                </Button>
                <Button
                  variant={previewDevice === "mobile" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setPreviewDevice("mobile")}
                >
                  <Smartphone className="h-4 w-4 mr-1" />
                  Mobile
                </Button>
              </div>
              {selectedFarmer && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/profil-petani/${selectedFarmerId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Buka di Tab Baru
                  </a>
                </Button>
              )}
            </div>

            {/* Preview Frame */}
            <div className="border rounded-lg bg-muted/30 overflow-hidden" style={{ minHeight: "500px" }}>
              {selectedFarmerId ? (
                <div className="flex justify-center p-4 bg-muted/50">
                  <div
                    className="bg-background rounded-lg shadow-lg overflow-hidden transition-all duration-300"
                    style={{ width: getPreviewWidth(), maxWidth: "100%" }}
                  >
                    <iframe
                      key={previewKey}
                      src={`/profil-petani/${selectedFarmerId}`}
                      className="w-full border-0"
                      style={{ height: "600px" }}
                      title="Preview Profil Petani"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                  <div className="text-center">
                    <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Pilih petani untuk melihat preview</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicProfileSettings;
