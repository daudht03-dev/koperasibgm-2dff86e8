import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calculator, Users, Calendar, RefreshCw, Zap } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { FarmerEstimation } from "@/hooks/use-harvest-estimation";

interface Farmer {
  id: string;
  nama: string;
  kode_petani: string;
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
  const [searchTerm, setSearchTerm] = useState("");

  const filteredFarmers = farmers.filter(
    (f) =>
      f.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.kode_petani.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFarmerToggle = (farmer: Farmer, checked: boolean) => {
    if (checked) {
      setSelectedFarmers([
        ...selectedFarmers,
        {
          farmerId: farmer.id,
          farmerName: farmer.nama,
          farmerCode: farmer.kode_petani,
          averageDaily: batchAverage,
        },
      ]);
    } else {
      setSelectedFarmers(selectedFarmers.filter((f) => f.farmerId !== farmer.id));
    }
  };

  const handleSelectAll = () => {
    if (selectedFarmers.length === filteredFarmers.length) {
      setSelectedFarmers([]);
    } else {
      setSelectedFarmers(
        filteredFarmers.map((f) => ({
          farmerId: f.id,
          farmerName: f.nama,
          farmerCode: f.kode_petani,
          averageDaily: batchAverage,
        }))
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
            <Button variant="outline" size="sm" onClick={handleSelectAll}>
              {selectedFarmers.length === filteredFarmers.length
                ? "Batal Pilih Semua"
                : "Pilih Semua"}
            </Button>
          </div>

          <Input
            placeholder="Cari nama atau kode petani..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <ScrollArea className="h-48 border rounded-md p-3">
            <div className="space-y-2">
              {filteredFarmers.map((farmer) => (
                <div
                  key={farmer.id}
                  className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected(farmer.id)}
                      onCheckedChange={(checked) =>
                        handleFarmerToggle(farmer, checked as boolean)
                      }
                    />
                    <div>
                      <span className="font-medium text-sm">{farmer.kode_petani}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        - {farmer.nama}
                      </span>
                    </div>
                  </div>
                  {isSelected(farmer.id) && (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      className="w-20 h-8 text-sm"
                      value={getSelectedFarmerAverage(farmer.id)}
                      onChange={(e) =>
                        updateFarmerAverage(farmer.id, parseFloat(e.target.value) || 0)
                      }
                      title="Rata-rata panen harian (kg)"
                    />
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
