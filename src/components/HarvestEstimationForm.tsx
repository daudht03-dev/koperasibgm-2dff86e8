import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Users, Calendar, RefreshCw, Zap, Save, Leaf, Factory, Filter, Settings2, Percent, Dices, Hand } from "lucide-react";
import { format } from "date-fns";
import { FarmerEstimation, HolidayMode, HolidayRateConfig } from "@/hooks/use-harvest-estimation";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface Farmer {
  id: string;
  nama: string;
  kode_petani: string;
  is_organic?: boolean;
  rata_rata_panen?: number | null;
  regulasi?: string | null;
}

interface HarvestEstimationFormProps {
  farmers: Farmer[];
  selectedFarmers: FarmerEstimation[];
  setSelectedFarmers: (farmers: FarmerEstimation[]) => void;
  startDate: Date;
  setStartDate: (date: Date) => void;
  autoHoliday: boolean;
  setAutoHoliday: (auto: boolean) => void;
  holidayMode: HolidayMode;
  setHolidayMode: (mode: HolidayMode) => void;
  manualHolidays: number[];
  setManualHolidays: (holidays: number[]) => void;
  holidayRates: HolidayRateConfig;
  saveHolidayRates: (rates: HolidayRateConfig) => void;
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
  regulasi: string;
}

export const HarvestEstimationForm = ({
  farmers,
  selectedFarmers,
  setSelectedFarmers,
  startDate,
  setStartDate,
  autoHoliday,
  setAutoHoliday,
  holidayMode,
  setHolidayMode,
  manualHolidays,
  setManualHolidays,
  holidayRates,
  saveHolidayRates,
  batchAverage,
  setBatchAverage,
  onGenerate,
  applyBatchAverage,
  updateFarmerAverage,
}: HarvestEstimationFormProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "organic" | "conventional">("all");
  const [filterSelection, setFilterSelection] = useState<"all" | "selected" | "unselected">("all");
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const [tempRates, setTempRates] = useState<HolidayRateConfig>(holidayRates);

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
              regulasi: setting.regulasi || farmer.regulasi || "",
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

  const filteredFarmers = farmers.filter((f) => {
    // Search filter
    const matchesSearch =
      f.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.kode_petani.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter (organic/conventional)
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "organic" && f.is_organic !== false) ||
      (filterStatus === "conventional" && f.is_organic === false);
    
    // Selection filter
    const isCurrentlySelected = selectedFarmers.some((sf) => sf.farmerId === f.id);
    const matchesSelection =
      filterSelection === "all" ||
      (filterSelection === "selected" && isCurrentlySelected) ||
      (filterSelection === "unselected" && !isCurrentlySelected);
    
    return matchesSearch && matchesStatus && matchesSelection;
  });

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
          averageDaily: savedSetting?.averageDaily ?? (farmer.rata_rata_panen ?? batchAverage),
          isOrganic: savedSetting?.isOrganic ?? (farmer.is_organic !== false),
          regulasi: savedSetting?.regulasi ?? (farmer.regulasi || ""),
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
            averageDaily: savedSetting?.averageDaily ?? (f.rata_rata_panen ?? batchAverage),
            isOrganic: savedSetting?.isOrganic ?? (f.is_organic !== false),
            regulasi: savedSetting?.regulasi ?? (f.regulasi || ""),
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

  const getSelectedFarmerRegulasi = (farmerId: string) => {
    const farmer = selectedFarmers.find((f) => f.farmerId === farmerId);
    return farmer?.regulasi || "";
  };

  const toggleFarmerRegulasi = (farmerId: string, reg: "EU" | "COR") => {
    setSelectedFarmers(
      selectedFarmers.map((f) => {
        if (f.farmerId !== farmerId) return f;
        const current = f.regulasi || "";
        const parts = current.split(",").filter(r => r.trim() !== "");
        
        if (parts.includes(reg)) {
          // Remove
          const newParts = parts.filter(r => r !== reg);
          return { ...f, regulasi: newParts.join(",") };
        } else {
          // Add
          const newParts = [...parts, reg].sort();
          return { ...f, regulasi: newParts.join(",") };
        }
      })
    );
  };

  const saveSettings = () => {
    const settings: SavedFarmerSetting[] = selectedFarmers.map((f) => ({
      farmerId: f.farmerId,
      averageDaily: f.averageDaily,
      isOrganic: f.isOrganic,
      regulasi: f.regulasi,
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
  const euCount = selectedFarmers.filter((f) => f.regulasi?.includes("EU")).length;
  const corCount = selectedFarmers.filter((f) => f.regulasi?.includes("COR")).length;

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
              {euCount > 0 && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                  EU: {euCount}
                </Badge>
              )}
              {corCount > 0 && (
                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
                  COR: {corCount}
                </Badge>
              )}
            </div>
          )}

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Cari nama atau kode petani..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={(value: "all" | "organic" | "conventional") => setFilterStatus(value)}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="h-4 w-4 mr-1" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="organic">
                    <span className="flex items-center gap-1">
                      <Leaf className="h-3 w-3 text-green-600" />
                      Organik
                    </span>
                  </SelectItem>
                  <SelectItem value="conventional">
                    <span className="flex items-center gap-1">
                      <Factory className="h-3 w-3 text-orange-500" />
                      Konvensional
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterSelection} onValueChange={(value: "all" | "selected" | "unselected") => setFilterSelection(value)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Pilihan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="selected">Sudah Dipilih</SelectItem>
                  <SelectItem value="unselected">Belum Dipilih</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Badge */}
          {(filterStatus !== "all" || filterSelection !== "all") && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filter aktif:</span>
              {filterStatus !== "all" && (
                <Badge variant="outline" className="text-xs">
                  {filterStatus === "organic" ? "Organik" : "Konvensional"}
                </Badge>
              )}
              {filterSelection !== "all" && (
                <Badge variant="outline" className="text-xs">
                  {filterSelection === "selected" ? "Sudah Dipilih" : "Belum Dipilih"}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-xs"
                onClick={() => {
                  setFilterStatus("all");
                  setFilterSelection("all");
                }}
              >
                Reset
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Menampilkan {filteredFarmers.length} dari {farmers.length} petani
          </p>

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
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Regulasi toggles */}
                      <div className="flex gap-1">
                        <Button
                          variant={getSelectedFarmerRegulasi(farmer.id).includes("EU") ? "default" : "outline"}
                          size="sm"
                          className={`h-6 px-2 text-xs ${
                            getSelectedFarmerRegulasi(farmer.id).includes("EU")
                              ? "bg-blue-600 hover:bg-blue-700"
                              : ""
                          }`}
                          onClick={() => toggleFarmerRegulasi(farmer.id, "EU")}
                          title="Klik untuk toggle EU"
                        >
                          EU
                        </Button>
                        <Button
                          variant={getSelectedFarmerRegulasi(farmer.id).includes("COR") ? "default" : "outline"}
                          size="sm"
                          className={`h-6 px-2 text-xs ${
                            getSelectedFarmerRegulasi(farmer.id).includes("COR")
                              ? "bg-amber-600 hover:bg-amber-700"
                              : ""
                          }`}
                          onClick={() => toggleFarmerRegulasi(farmer.id, "COR")}
                          title="Klik untuk toggle COR"
                        >
                          COR
                        </Button>
                      </div>
                      {/* Organic toggle */}
                      <Button
                        variant={getSelectedFarmerOrganic(farmer.id) ? "default" : "secondary"}
                        size="sm"
                        className={`h-6 px-2 text-xs ${
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
                      {/* Average input */}
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        className="w-16 h-6 text-xs"
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
          <Label>Rata-rata Panen Harian</Label>
          
          {/* Info about imported averages */}
          <p className="text-xs text-muted-foreground">
            Rata-rata panen otomatis diambil dari data petani (kolom rata_rata_panen di CSV import). 
            Anda juga bisa input manual per petani atau terapkan nilai batch di bawah.
          </p>

          {/* Manual batch input */}
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
              Terapkan Manual
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
          </div>
          
          {/* Mode Selection */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={holidayMode === "auto" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setHolidayMode("auto");
                setAutoHoliday(true);
              }}
            >
              <Dices className="h-4 w-4 mr-1" />
              Otomatis
            </Button>
            <Button
              variant={holidayMode === "percentage" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setHolidayMode("percentage");
                setAutoHoliday(true);
              }}
            >
              <Percent className="h-4 w-4 mr-1" />
              Persentase
            </Button>
            <Button
              variant={holidayMode === "manual" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setHolidayMode("manual");
                setAutoHoliday(false);
              }}
            >
              <Hand className="h-4 w-4 mr-1" />
              Manual
            </Button>
          </div>

          {/* Mode Description */}
          {holidayMode === "auto" && (
            <p className="text-xs text-muted-foreground">
              Sistem akan memilih 0-3 hari libur secara acak dengan probabilitas sama (25% masing-masing)
            </p>
          )}

          {holidayMode === "percentage" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Hari libur dipilih berdasarkan rate kemunculan yang bisa diatur
              </p>
              <div className="flex gap-2 flex-wrap text-xs">
                <Badge variant="outline">0 hari: {holidayRates.rate0Days}%</Badge>
                <Badge variant="outline">1 hari: {holidayRates.rate1Day}%</Badge>
                <Badge variant="outline">2 hari: {holidayRates.rate2Days}%</Badge>
                <Badge variant="outline">3 hari: {holidayRates.rate3Days}%</Badge>
              </div>
              <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTempRates(holidayRates)}
                  >
                    <Settings2 className="h-4 w-4 mr-1" />
                    Atur Rate
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pengaturan Rate Hari Libur</DialogTitle>
                    <DialogDescription>
                      Atur persentase kemunculan jumlah hari libur (seperti sistem gacha)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Libur 0 hari</Label>
                        <span className="text-sm font-medium">{tempRates.rate0Days}%</span>
                      </div>
                      <Slider
                        value={[tempRates.rate0Days]}
                        onValueChange={([value]) => setTempRates({ ...tempRates, rate0Days: value })}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Libur 1 hari</Label>
                        <span className="text-sm font-medium">{tempRates.rate1Day}%</span>
                      </div>
                      <Slider
                        value={[tempRates.rate1Day]}
                        onValueChange={([value]) => setTempRates({ ...tempRates, rate1Day: value })}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Libur 2 hari</Label>
                        <span className="text-sm font-medium">{tempRates.rate2Days}%</span>
                      </div>
                      <Slider
                        value={[tempRates.rate2Days]}
                        onValueChange={([value]) => setTempRates({ ...tempRates, rate2Days: value })}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>Libur 3 hari</Label>
                        <span className="text-sm font-medium">{tempRates.rate3Days}%</span>
                      </div>
                      <Slider
                        value={[tempRates.rate3Days]}
                        onValueChange={([value]) => setTempRates({ ...tempRates, rate3Days: value })}
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground">
                        <strong>Catatan:</strong> Nilai tidak perlu berjumlah 100%. 
                        Sistem akan menormalisasi secara proporsional. 
                        Contoh: 80:15:10:5 akan menjadi ~73%:14%:9%:4%
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRateDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={() => {
                      saveHolidayRates(tempRates);
                      setRateDialogOpen(false);
                    }}>
                      Simpan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {holidayMode === "manual" && (
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