import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackagingLabel } from "@/components/PackagingLabel";
import { useFarmers } from "@/hooks/use-farmers";
import { useLabelSettings, LabelSettings } from "@/hooks/use-label-settings";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { Printer, Settings, FileDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";

export const LabelManagement = () => {
  const { farmers } = useFarmers();
  const { labelSettings, getLabelSettingByFarmerId, upsertLabelSetting } = useLabelSettings();
  const { profile } = useCompanyProfile();
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [bulkPrintDialogOpen, setBulkPrintDialogOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const [currentSettings, setCurrentSettings] = useState<Partial<LabelSettings>>({
    eu_certified: false,
    cor_nop_certified: false,
    sni_certified: false,
    is_organic: true,
    berat_kg: 1,
  });

  const handleOpenSettings = async (farmerId: string) => {
    setSelectedFarmerId(farmerId);
    const existing = await getLabelSettingByFarmerId(farmerId);
    
    if (existing) {
      setCurrentSettings(existing);
    } else {
      setCurrentSettings({
        petani_id: farmerId,
        eu_certified: false,
        cor_nop_certified: false,
        sni_certified: false,
        is_organic: true,
        berat_kg: 1,
      });
    }
    setSettingsDialogOpen(true);
  };

  const handleSaveSettings = async () => {
    const success = await upsertLabelSetting({
      ...currentSettings,
      petani_id: selectedFarmerId,
    });
    
    if (success) {
      setSettingsDialogOpen(false);
    }
  };

  const handlePreviewLabel = async (farmerId: string) => {
    setSelectedFarmerId(farmerId);
    const existing = await getLabelSettingByFarmerId(farmerId);
    
    if (existing) {
      setCurrentSettings(existing);
    } else {
      setCurrentSettings({
        petani_id: farmerId,
        eu_certified: false,
        cor_nop_certified: false,
        sni_certified: false,
        is_organic: true,
        berat_kg: 1,
      });
    }
    setPreviewDialogOpen(true);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Label_${farmers.find(f => f.id === selectedFarmerId)?.nama || 'Petani'}`,
  });

  const handleBulkPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Label_Semua_Petani',
  });

  const selectedFarmer = farmers.find(f => f.id === selectedFarmerId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Manajemen Label Kemasan
          </CardTitle>
          <CardDescription>
            Kelola dan cetak label kemasan untuk setiap petani
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end">
            <Dialog open={bulkPrintDialogOpen} onOpenChange={setBulkPrintDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Cetak Semua Label
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cetak Semua Label</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div ref={printRef} className="space-y-8 print:space-y-0">
                    {farmers.map((farmer) => {
                      const settings = labelSettings.find(s => s.petani_id === farmer.id);
                      return (
                        <div key={farmer.id} className="flex justify-center">
                          <PackagingLabel
                            farmerName={farmer.nama}
                            farmerId={farmer.id}
                            weight={settings?.berat_kg || 1}
                            euCertified={settings?.eu_certified || false}
                            corNopCertified={settings?.cor_nop_certified || false}
                            sniCertified={settings?.sni_certified || false}
                            isOrganic={settings?.is_organic !== false}
                            companyName={profile?.nama_perusahaan}
                            showForPrint={true}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <Button onClick={handleBulkPrint} className="w-full">
                    <Printer className="h-4 w-4 mr-2" />
                    Cetak Semua
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Petani</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Status Label</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {farmers.map((farmer) => {
                const hasSettings = labelSettings.some(s => s.petani_id === farmer.id);
                return (
                  <TableRow key={farmer.id}>
                    <TableCell className="font-medium">{farmer.nama}</TableCell>
                    <TableCell>{farmer.kode_petani}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${hasSettings ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {hasSettings ? 'Sudah Diatur' : 'Belum Diatur'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenSettings(farmer.id)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Atur
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handlePreviewLabel(farmer.id)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Cetak
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              {farmers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Belum ada data petani
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pengaturan Label - {selectedFarmer?.nama}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="weight">Berat (Kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                value={currentSettings.berat_kg || 1}
                onChange={(e) => setCurrentSettings({ ...currentSettings, berat_kg: parseFloat(e.target.value) })}
              />
            </div>

            <div className="space-y-3">
              <Label>Sertifikasi</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="eu"
                  checked={currentSettings.eu_certified}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({ ...currentSettings, eu_certified: checked as boolean })
                  }
                />
                <label htmlFor="eu" className="text-sm font-medium">EU</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cor-nop"
                  checked={currentSettings.cor_nop_certified}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({ ...currentSettings, cor_nop_certified: checked as boolean })
                  }
                />
                <label htmlFor="cor-nop" className="text-sm font-medium">COR-NOP Equivalent</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sni"
                  checked={currentSettings.sni_certified}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({ ...currentSettings, sni_certified: checked as boolean })
                  }
                />
                <label htmlFor="sni" className="text-sm font-medium">SNI</label>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Status Produk</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="organic"
                  checked={currentSettings.is_organic}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({ ...currentSettings, is_organic: checked as boolean })
                  }
                />
                <label htmlFor="organic" className="text-sm font-medium">Organik</label>
              </div>
            </div>

            <Button onClick={handleSaveSettings} className="w-full">
              Simpan Pengaturan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview & Print Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Label - {selectedFarmer?.nama}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div ref={printRef} className="flex justify-center">
              {selectedFarmer && (
                <PackagingLabel
                  farmerName={selectedFarmer.nama}
                  farmerId={selectedFarmer.id}
                  weight={currentSettings.berat_kg || 1}
                  euCertified={currentSettings.eu_certified || false}
                  corNopCertified={currentSettings.cor_nop_certified || false}
                  sniCertified={currentSettings.sni_certified || false}
                  isOrganic={currentSettings.is_organic !== false}
                  companyName={profile?.nama_perusahaan}
                  showForPrint={true}
                />
              )}
            </div>
            <Button onClick={handlePrint} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Cetak Label
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
