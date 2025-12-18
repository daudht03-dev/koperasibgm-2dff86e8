import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, Award, Leaf, Building, Save, ExternalLink } from "lucide-react";
import { useCompanyProfile } from "@/hooks/use-company-profile";
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
  const [settings, setSettings] = useState<PublicProfileSettingsData>(defaultSettings);
  const [saving, setSaving] = useState(false);

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

  const previewUrl = `/farmer/${crypto.randomUUID().slice(0, 8)}`;

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

        {/* Preview Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Preview Halaman
            </CardTitle>
            <CardDescription>
              Lihat tampilan profil petani seperti yang dilihat pengunjung
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Untuk melihat preview, scan QR code petani atau buka halaman profil petani langsung.
            </p>
            
            <div className="p-4 bg-gradient-to-br from-organic-green/10 to-organic-cream/30 rounded-lg">
              <h4 className="font-medium mb-2">Cara Preview:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Buka tab "Petani" di dashboard</li>
                <li>Klik icon QR pada baris petani</li>
                <li>Scan QR code atau klik "Buka Profil"</li>
              </ol>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Buka Halaman Utama
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicProfileSettings;
