import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { RefreshCw, Plus, Trash2, TrendingUp, Leaf, Download, Save, FolderOpen, Loader2, Factory, Tag, Dices, Percent, Hand, Settings2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { WeekData, SavedEstimation, HolidayMode, HolidayRateConfig } from "@/hooks/use-harvest-estimation";
import { naturalSort } from "@/lib/utils";
import { generateProductCode } from "@/lib/product-code";

// Sort farmers data by pengepul first, then by farmerCode
const sortFarmersDataByPengepul = <T extends { farmerCode: string; pengepulName?: string }>(farmers: T[]): T[] => {
  return [...farmers].sort((a, b) => {
    const pA = a.pengepulName || "zzz";
    const pB = b.pengepulName || "zzz";
    if (pA !== pB) return pA.localeCompare(pB);
    return naturalSort(a.farmerCode, b.farmerCode);
  });
};

const sortFarmersDataByCode = <T extends { farmerCode: string }>(farmers: T[]): T[] => {
  return [...farmers].sort((a, b) => naturalSort(a.farmerCode, b.farmerCode));
};

interface HarvestEstimationTableProps {
  weeklyData: WeekData[];
  savedEstimations: SavedEstimation[];
  isSaving: boolean;
  isLoading: boolean;
  holidayMode: HolidayMode;
  setHolidayMode: (mode: HolidayMode) => void;
  manualHolidays: number[];
  setManualHolidays: (holidays: number[]) => void;
  holidayRates: HolidayRateConfig;
  saveHolidayRates: (rates: HolidayRateConfig) => void;
  onRefreshAll: () => void;
  onRefreshHarvest: () => void;
  onRefreshSales: () => void;
  onAddNextWeek: () => void;
  onRefreshWeek: (weekIndex: number, type: 'all' | 'harvest' | 'sales') => void;
  onRemoveWeek: (weekIndex: number) => void;
  onExportCSV: () => void;
  onSave: (name: string, notes?: string) => Promise<boolean>;
  onLoadSaved: () => void;
  onLoadEstimation: (estimation: SavedEstimation) => void;
  onDeleteEstimation: (id: string) => void;
}

export const HarvestEstimationTable = ({
  weeklyData,
  savedEstimations,
  isSaving,
  isLoading,
  holidayMode,
  setHolidayMode,
  manualHolidays,
  setManualHolidays,
  holidayRates,
  saveHolidayRates,
  onRefreshAll,
  onRefreshHarvest,
  onRefreshSales,
  onAddNextWeek,
  onRefreshWeek,
  onRemoveWeek,
  onExportCSV,
  onSave,
  onLoadSaved,
  onLoadEstimation,
  onDeleteEstimation,
}: HarvestEstimationTableProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotes, setSaveNotes] = useState("");
  const [nextWeekDialogOpen, setNextWeekDialogOpen] = useState(false);
  const [tempHolidayMode, setTempHolidayMode] = useState<HolidayMode>(holidayMode);
  const [tempManualHolidays, setTempManualHolidays] = useState<number[]>(manualHolidays);
  const [tempRates, setTempRates] = useState<HolidayRateConfig>(holidayRates);
  const [rateDialogOpen, setRateDialogOpen] = useState(false);
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  const handleSave = async () => {
    if (!saveName.trim()) return;
    const success = await onSave(saveName, saveNotes);
    if (success) {
      setSaveDialogOpen(false);
      setSaveName("");
      setSaveNotes("");
    }
  };

  const handleOpenLoadDialog = () => {
    onLoadSaved();
    setLoadDialogOpen(true);
  };

  if (weeklyData.length === 0) {
    return (
      <div className="space-y-4">
        {/* Load Saved Button */}
        <div className="flex justify-end">
          <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={handleOpenLoadDialog}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Muat Data Tersimpan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Data Estimasi Tersimpan</DialogTitle>
                <DialogDescription>
                  Pilih estimasi yang ingin dimuat
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[50vh]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : savedEstimations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Belum ada data tersimpan
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedEstimations.map((est) => (
                      <Card key={est.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{est.nama_estimasi}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(est.tanggal_mulai), "dd MMM yyyy", { locale: localeId })} - {format(new Date(est.tanggal_selesai), "dd MMM yyyy", { locale: localeId })}
                            </p>
                            {est.catatan && (
                              <p className="text-sm text-muted-foreground mt-1">{est.catatan}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Disimpan: {format(new Date(est.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                onLoadEstimation(est);
                                setLoadDialogOpen(false);
                              }}
                            >
                              Muat
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onDeleteEstimation(est.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-dashed border-2 border-muted-foreground/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-center">
              Belum ada data estimasi.
              <br />
              Pilih petani dan klik "Generate" untuk memulai.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDayName = (date: Date) => {
    return format(date, "EEE", { locale: localeId });
  };

  const formatDate = (date: Date) => {
    return format(date, "dd/MM", { locale: localeId });
  };

  return (
    <div className="space-y-6">
      {/* Global Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={onRefreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Semua
        </Button>
        <Button variant="outline" onClick={onRefreshHarvest}>
          <Leaf className="h-4 w-4 mr-2" />
          Refresh Panen
        </Button>
        <Button variant="outline" onClick={onRefreshSales}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh Penjualan
        </Button>
        <Button onClick={() => {
          setTempHolidayMode(holidayMode);
          setTempManualHolidays(manualHolidays);
          setTempRates(holidayRates);
          setNextWeekDialogOpen(true);
        }} className="bg-gradient-organic">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Minggu Berikutnya
        </Button>
        <div className="flex-1" />
        <Button variant="outline" onClick={onExportCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
        
        {/* Save Dialog */}
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Simpan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Simpan Estimasi</DialogTitle>
              <DialogDescription>
                Simpan data estimasi untuk dilihat kembali nanti
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nama Estimasi *</label>
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Contoh: Estimasi Desember 2024"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Catatan (opsional)</label>
                <Textarea
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                  placeholder="Catatan tambahan..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleSave} disabled={!saveName.trim() || isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Load Dialog */}
        <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" onClick={handleOpenLoadDialog}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Muat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Data Estimasi Tersimpan</DialogTitle>
              <DialogDescription>
                Pilih estimasi yang ingin dimuat
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : savedEstimations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada data tersimpan
                </p>
              ) : (
                <div className="space-y-2">
                  {savedEstimations.map((est) => (
                    <Card key={est.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{est.nama_estimasi}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(est.tanggal_mulai), "dd MMM yyyy", { locale: localeId })} - {format(new Date(est.tanggal_selesai), "dd MMM yyyy", { locale: localeId })}
                          </p>
                          {est.catatan && (
                            <p className="text-sm text-muted-foreground mt-1">{est.catatan}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Disimpan: {format(new Date(est.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              onLoadEstimation(est);
                              setLoadDialogOpen(false);
                            }}
                          >
                            Muat
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDeleteEstimation(est.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      {/* Weekly Tables */}
      {weeklyData.map((week) => (
        <div key={week.weekIndex} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Minggu {week.weekIndex + 1}: {format(week.startDate, "dd MMM yyyy", { locale: localeId })} -{" "}
              {format(week.endDate, "dd MMM yyyy", { locale: localeId })}
            </h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRefreshWeek(week.weekIndex, 'all')}
                title="Refresh minggu ini"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              {weeklyData.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveWeek(week.weekIndex)}
                  title="Hapus minggu ini"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>

          {/* Info: Holidays per farmer */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Hari libur diacak per petani (0-3 hari)
            </span>
          </div>

          {/* Side by Side Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Harvest Table */}
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-primary" />
                    Estimasi Panen
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRefreshWeek(week.weekIndex, 'harvest')}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">
                          Petani ↓
                        </TableHead>
                        <TableHead className="sticky left-[100px] bg-background z-10 min-w-[70px]">
                          Kode
                        </TableHead>
                        <TableHead className="min-w-[90px]">Pengepul</TableHead>
                        {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                          const date = addDays(week.startDate, dayIndex);
                          return (
                            <TableHead
                              key={dayIndex}
                              className="text-center min-w-[60px]"
                            >
                              <div className="flex flex-col items-center">
                                <span className="text-xs">{getDayName(date)}</span>
                                <span className="font-medium">{formatDate(date)}</span>
                              </div>
                            </TableHead>
                          );
                        })}
                        <TableHead className="text-center bg-primary/10 min-w-[70px]">
                          <div className="flex flex-col items-center">
                            <span className="text-xs">Total</span>
                            <span className="font-medium">
                              {formatDate(addDays(week.endDate, 1))}
                            </span>
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortFarmersDataByPengepul(week.farmersData).map((farmer) => (
                        <TableRow key={farmer.farmerId}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            <div className="flex items-center gap-1">
                              {farmer.isOrganic ? (
                                <Leaf className="h-3 w-3 text-green-600 flex-shrink-0" />
                              ) : (
                                <Factory className="h-3 w-3 text-orange-500 flex-shrink-0" />
                              )}
                              <span className="truncate">{farmer.farmerName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="sticky left-[100px] bg-background z-10 text-muted-foreground">
                            {farmer.farmerCode}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {farmer.pengepulName || "-"}
                          </TableCell>
                          {farmer.dailyHarvest.map((day, index) => {
                            // Use farmer's own holidays instead of week-level holidays
                            const isHoliday = farmer.holidays?.includes(index) ?? false;
                            return (
                              <TableCell
                                key={index}
                                className={`text-center ${
                                  isHoliday ? "bg-destructive/10 text-destructive" : ""
                                } ${day.value === 0 ? "text-muted-foreground" : ""}`}
                              >
                                {day.value.toFixed(1)}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-semibold bg-primary/10">
                            {farmer.totalHarvest.toFixed(1)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell className="sticky left-0 bg-muted/50 z-10">
                          TOTAL
                        </TableCell>
                        <TableCell className="sticky left-[100px] bg-muted/50 z-10"></TableCell>
                        <TableCell></TableCell>
                        {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                          const dayTotal = week.farmersData.reduce(
                            (sum, f) => sum + (f.dailyHarvest[dayIndex]?.value || 0),
                            0
                          );
                          return (
                            <TableCell key={dayIndex} className="text-center">
                              {dayTotal.toFixed(1)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center bg-primary/20">
                          {week.farmersData
                            .reduce((sum, f) => sum + f.totalHarvest, 0)
                            .toFixed(1)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Sales Table */}
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Estimasi Penjualan
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRefreshWeek(week.weekIndex, 'sales')}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">
                          Petani ↓
                        </TableHead>
                        <TableHead className="sticky left-[100px] bg-background z-10 min-w-[70px]">
                          Kode
                        </TableHead>
                        {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                          const date = addDays(week.startDate, dayIndex);
                          return (
                            <TableHead key={dayIndex} className="text-center min-w-[60px]">
                              <div className="flex flex-col items-center">
                                <span className="text-xs">{getDayName(date)}</span>
                                <span className="font-medium">{formatDate(date)}</span>
                              </div>
                            </TableHead>
                          );
                        })}
                        <TableHead className="text-center bg-emerald-500/10 min-w-[70px]">
                          Total
                        </TableHead>
                        <TableHead className="text-center min-w-[100px]">
                          Pengepul
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortFarmersDataByPengepul(week.farmersData).map((farmer) => (
                        <TableRow key={farmer.farmerId}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            <div className="flex items-center gap-1">
                              {farmer.isOrganic ? (
                                <Leaf className="h-3 w-3 text-green-600 flex-shrink-0" />
                              ) : (
                                <Factory className="h-3 w-3 text-orange-500 flex-shrink-0" />
                              )}
                              <span className="truncate">{farmer.farmerName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="sticky left-[100px] bg-background z-10 text-muted-foreground">
                            {farmer.farmerCode}
                          </TableCell>
                          {farmer.dailySales.map((day, index) => {
                            // Use salesBreakdown from the data
                            const contributingDays = farmer.salesBreakdown?.[index] || [];
                            const hasMultipleSources = contributingDays.length > 1;

                            return (
                              <TableCell
                                key={index}
                                className={`text-center ${
                                  day.value === 0 ? "text-muted-foreground" : "text-emerald-600 font-medium"
                                }`}
                              >
                                {day.value > 0 && hasMultipleSources ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="cursor-help underline decoration-dotted decoration-emerald-400">
                                          {day.value.toFixed(1)}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs">
                                        <div className="text-xs space-y-1">
                                          <p className="font-medium mb-1">Gabungan dari {contributingDays.length} hari panen:</p>
                                          {contributingDays.map(dayIdx => {
                                            const harvestDay = farmer.dailyHarvest[dayIdx];
                                            const harvestDate = format(addDays(week.startDate, dayIdx), "yyyy-MM-dd");
                                            const code = generateProductCode(farmer.farmerCode, harvestDate, dayIdx + 1);
                                            return (
                                              <div key={dayIdx} className="flex items-center gap-1">
                                                <Tag className="h-2.5 w-2.5 text-blue-500" />
                                                <span className="font-mono">{code}</span>
                                                <span>({harvestDay?.value.toFixed(1)} Kg - {format(addDays(week.startDate, dayIdx), "dd MMM", { locale: localeId })})</span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  day.value.toFixed(1)
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center font-semibold bg-emerald-500/10">
                            {farmer.totalSales.toFixed(1)}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {farmer.pengepulName || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Total Row */}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell className="sticky left-0 bg-muted/50 z-10">
                          TOTAL
                        </TableCell>
                        <TableCell className="sticky left-[100px] bg-muted/50 z-10"></TableCell>
                        {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                          const dayTotal = week.farmersData.reduce(
                            (sum, f) => sum + (f.dailySales[dayIndex]?.value || 0),
                            0
                          );
                          return (
                            <TableCell key={dayIndex} className="text-center">
                              {dayTotal.toFixed(1)}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center bg-emerald-500/20">
                          {week.farmersData
                            .reduce((sum, f) => sum + f.totalSales, 0)
                            .toFixed(1)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
};
