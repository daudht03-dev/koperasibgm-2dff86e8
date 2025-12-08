import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calculator, Users, Calendar, RefreshCw, Zap, Save, Leaf, Factory } from "lucide-react";
import { format } from "date-fns";
import { FarmerEstimation } from "@/hooks/use-harvest-estimation";
import { useToast } from "@/hooks/use-toast";

interface Farmer {
  id: string;
  nama: string;
  kode_petani: string;
  is_organic?: boolean;
}

interface HarvestEstimationFormProps {
  farmers: Farmer[];
  selectedFarmers: FarmerEstimation[];
  setSelectedFarmers: (farmers: FarmerEstimation[]) => void;
  startDate: Date;
  setStartDate: (date: Date) => void;
  autoHoliday: boolean;
  setAutoHoliday: (auto: boolean) => void;
  manualHolidays: number[];
  setManualHolidays: (holidays: number[]) => void;
  batchAverage: number;
  setBatchAverage: (avg: number) => void;
  onGenerate: () => void;
  applyBatchAverage: () => void;
  updateFarmerAverage: (farmerId: string, average: number) => void;
}

const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const FARMER_SETTINGS_KEY = "harvest_estimation_farmer_settings";

interface SavedFarmerSetting {
  farmerId: string;
  averageDaily: number;
  isOrganic: boolean;
}

export const HarvestEstimationForm = ({
  farmers,
  selectedFarmers,
  setSelectedFarmers,
  startDate,
  setStartDate,
  autoHoliday,
  setAutoHoliday,
  manualHolidays,
  setManualHolidays,
  batchAverage,
  setBatchAverage,
  onGenerate,
  applyBatchAverage,
  updateFarmerAverage,
}: HarvestEstimationFormProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  // Load saved settings on mount
  useEffect(() => {
    const saved = localStorage.getItem(FARMER_SETTINGS_KEY);
    if (saved && selectedFarmers.length > 0) {
      try {
        const savedSettings: SavedFarmerSetting[] = JSON.parse(saved);
        const updatedFarmers = selectedFarmers.map(farmer => {
          const setting = savedSettings.find(s => s.farmerId === farmer.farmerId);
          if (setting) {
            return {
              ...farmer,
              averageDaily: setting.averageDaily,
              isOrganic: setting.isOrganic,
            };
          }
          return farmer;
        });
        setSelectedFarmers(updatedFarmers);
      } catch (e) {
        console.error("Error loading saved settings:", e);
      }
    }
  }, []);

  const filteredFarmers = farmers.filter(
    (f) =>
      f.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.kode_petani.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFarmerToggle = (farmer: Farmer, checked: boolean) => {
    // Load saved setting for this farmer
    const saved = localStorage.getItem(FARMER_SETTINGS_KEY);
    let savedSettings: SavedFarmerSetting[] = [];
    if (saved) {
      try {
        savedSettings = JSON.parse(saved);
      } catch (e) {}
    }
    const savedSetting = savedSettings.find(s => s.farmerId === farmer.id);

    if (checked) {
      setSelectedFarmers([
        ...selectedFarmers,
        {
          farmerId: farmer.id,
          farmerName: farmer.nama,
          farmerCode: farmer.kode_petani,
          averageDaily: savedSetting?.averageDaily ?? batchAverage,
          isOrganic: savedSetting?.isOrganic ?? (farmer.is_organic !== false),
        },
      ]);
    } else {
      setSelectedFarmers(selectedFarmers.filter((f) => f.farmerId !== farmer.id));
    }
  };

  const handleSelectAll = () => {
    // Load saved settings
    const saved = localStorage.getItem(FARMER_SETTINGS_KEY);
    let savedSettings: SavedFarmerSetting[] = [];
    if (saved) {
      try {
        savedSettings = JSON.parse(saved);
      } catch (e) {}
    }

    if (selectedFarmers.length === filteredFarmers.length) {
      setSelectedFarmers([]);
    } else {
      setSelectedFarmers(
        filteredFarmers.map((f) => {
          const savedSetting = savedSettings.find(s => s.farmerId === f.id);
          return {
            farmerId: f.id,
            farmerName: f.nama,
            farmerCode: f.kode_petani,
            averageDaily: savedSetting?.averageDaily ?? batchAverage,
            isOrganic: savedSetting?.isOrganic ?? (f.is_organic !== false),
          };
        })
      );
    }
  };

  const handleManualHolidayToggle = (dayIndex: number) => {
    if (manualHolidays.includes(dayIndex)) {
      setManualHolidays(manualHolidays.filter((d) => d !== dayIndex));
    } else if (manualHolidays.length < 3) {
      setManualHolidays([...manualHolidays, dayIndex].sort((a, b) => a - b));
    }
  };

  const isSelected = (farmerId: string) =>
    selectedFarmers.some((f) => f.farmerId === farmerId);

  const getSelectedFarmerAverage = (farmerId: string) => {
    const farmer = selectedFarmers.find((f) => f.farmerId === farmerId);
    return farmer?.averageDaily || batchAverage;
  };

  const getSelectedFarmerOrganic = (farmerId: string) => {
    const farmer = selectedFarmers.find((f) => f.farmerId === farmerId);
    return farmer?.isOrganic ?? true;
  };

  const updateFarmerOrganic = (farmerId: string, isOrganic: boolean) => {
    setSelectedFarmers(
      selectedFarmers.map((f) =>
        f.farmerId === farmerId ? { ...f, isOrganic } : f
      )
    );
  };

  const saveSettings = () => {
    const settings: SavedFarmerSetting[] = selectedFarmers.map((f) => ({
      farmerId: f.farmerId,
      averageDaily: f.averageDaily,
      isOrganic: f.isOrganic,
    }));
    localStorage.setItem(FARMER_SETTINGS_KEY, JSON.stringify(settings));
    toast({
      title: "Pengaturan disimpan",
      description: `Pengaturan ${settings.length} petani berhasil disimpan.`,
    });
  };

  // Count organic and conventional farmers
  const organicCount = selectedFarmers.filter((f) => f.isOrganic).length;
  const conventionalCount = selectedFarmers.filter((f) => !f.isOrganic).length;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Form Estimasi Panen
        </CardTitle>
        <CardDescription>
          Pilih petani dan konfigurasi untuk generate estimasi panen mingguan
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Farmer Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Pilih Petani ({selectedFarmers.length} dipilih)
            </Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedFarmers.length === filteredFarmers.length
                  ? "Batal Pilih Semua"
                  : "Pilih Semua"}
              </Button>
            </div>
          </div>

          {selectedFarmers.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default" className="bg-green-600">
                <Leaf className="h-3 w-3 mr-1" />
                Organik: {organicCount}
              </Badge>
              <Badge variant="secondary" className="bg-orange-500 text-white">
                <Factory className="h-3 w-3 mr-1" />
                Konvensional: {conventionalCount}
              </Badge>
            </div>
          )}

          <Input
            placeholder="Cari nama atau kode petani..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <ScrollArea className="h-56 border rounded-md p-3">
            <div className="space-y-2">
              {filteredFarmers.map((farmer) => (
                <div
                  key={farmer.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Checkbox
                      checked={isSelected(farmer.id)}
                      onCheckedChange={(checked) =>
                        handleFarmerToggle(farmer, checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{farmer.kode_petani}</span>
                      <span className="text-muted-foreground text-sm ml-2 truncate">
                        - {farmer.nama}
                      </span>
                    </div>
                  </div>
                  {isSelected(farmer.id) && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={getSelectedFarmerOrganic(farmer.id) ? "default" : "secondary"}
                        size="sm"
                        className={`h-7 px-2 text-xs ${
                          getSelectedFarmerOrganic(farmer.id)
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                        onClick={() =>
                          updateFarmerOrganic(farmer.id, !getSelectedFarmerOrganic(farmer.id))
                        }
                        title="Klik untuk toggle Organik/Konvensional"
                      >
                        {getSelectedFarmerOrganic(farmer.id) ? (
                          <>
                            <Leaf className="h-3 w-3 mr-1" />
                            O
                          </>
                        ) : (
                          <>
                            <Factory className="h-3 w-3 mr-1" />
                            K
                          </>
                        )}
                      </Button>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        className="w-16 h-7 text-xs"
                        value={getSelectedFarmerAverage(farmer.id)}
                        onChange={(e) =>
                          updateFarmerAverage(farmer.id, parseFloat(e.target.value) || 0)
                        }
                        title="Rata-rata panen harian (kg)"
                      />
                    </div>
                  )}
                </div>
              ))}
              {filteredFarmers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Tidak ada petani ditemukan
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Batch Average Input */}
        <div className="space-y-3">
          <Label>Rata-rata Panen Harian (Batch)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              min="0"
              value={batchAverage}
              onChange={(e) => setBatchAverage(parseFloat(e.target.value) || 0)}
              placeholder="5.0"
              className="flex-1"
            />
            <Button
              variant="secondary"
              onClick={applyBatchAverage}
              disabled={selectedFarmers.length === 0}
            >
              <Zap className="h-4 w-4 mr-1" />
              Terapkan ke Semua
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Nilai ini akan digunakan sebagai acuan dengan variasi ±1.9 kg
          </p>
        </div>

        {/* Save Settings Button */}
        <Button
          variant="outline"
          onClick={saveSettings}
          disabled={selectedFarmers.length === 0}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          Simpan Pengaturan Petani
        </Button>

        {/* Start Date */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Tanggal Mulai
          </Label>
          <Input
            type="date"
            value={format(startDate, "yyyy-MM-dd")}
            onChange={(e) => setStartDate(new Date(e.target.value))}
          />
          <p className="text-xs text-muted-foreground">
            Sistem akan menghitung 7 hari dari tanggal ini
          </p>
        </div>

        {/* Holiday Mode */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Mode Hari Libur</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {autoHoliday ? "Otomatis" : "Manual"}
              </span>
              <Switch checked={!autoHoliday} onCheckedChange={() => setAutoHoliday(!autoHoliday)} />
            </div>
          </div>

          {autoHoliday ? (
            <p className="text-xs text-muted-foreground">
              Sistem akan memilih 0-3 hari libur secara acak
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Pilih hari libur (maksimal 3 hari)
              </p>
              <div className="flex gap-2 flex-wrap">
                {dayNames.map((day, index) => (
                  <Button
                    key={index}
                    variant={manualHolidays.includes(index) ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleManualHolidayToggle(index)}
                    disabled={
                      !manualHolidays.includes(index) && manualHolidays.length >= 3
                    }
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <Button
          className="w-full bg-gradient-organic"
          size="lg"
          onClick={onGenerate}
          disabled={selectedFarmers.length === 0}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Generate Estimasi Panen & Penjualan
        </Button>
      </CardContent>
    </Card>
  );
};