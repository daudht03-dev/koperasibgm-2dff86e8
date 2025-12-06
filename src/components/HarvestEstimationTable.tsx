import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, Plus, Trash2, TrendingUp, Leaf } from "lucide-react";
import { format, addDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { WeekData } from "@/hooks/use-harvest-estimation";

interface HarvestEstimationTableProps {
  weeklyData: WeekData[];
  onRefreshAll: () => void;
  onRefreshHarvest: () => void;
  onRefreshSales: () => void;
  onAddNextWeek: () => void;
  onRefreshWeek: (weekIndex: number, type: 'all' | 'harvest' | 'sales') => void;
  onRemoveWeek: (weekIndex: number) => void;
}

export const HarvestEstimationTable = ({
  weeklyData,
  onRefreshAll,
  onRefreshHarvest,
  onRefreshSales,
  onAddNextWeek,
  onRefreshWeek,
  onRemoveWeek,
}: HarvestEstimationTableProps) => {
  if (weeklyData.length === 0) {
    return (
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
        <Button onClick={onAddNextWeek} className="bg-gradient-organic">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Minggu Berikutnya
        </Button>
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

          {/* Holidays Badge */}
          {week.holidays.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Hari Libur:</span>
              {week.holidays.map((dayIndex) => (
                <Badge key={dayIndex} variant="secondary">
                  {getDayName(addDays(week.startDate, dayIndex))} ({formatDate(addDays(week.startDate, dayIndex))})
                </Badge>
              ))}
            </div>
          )}

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
                          Petani
                        </TableHead>
                        <TableHead className="sticky left-[100px] bg-background z-10 min-w-[70px]">
                          Kode
                        </TableHead>
                        {[0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
                          const date = addDays(week.startDate, dayIndex);
                          const isHoliday = week.holidays.includes(dayIndex);
                          return (
                            <TableHead
                              key={dayIndex}
                              className={`text-center min-w-[60px] ${isHoliday ? "bg-destructive/10" : ""}`}
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
                      {week.farmersData.map((farmer) => (
                        <TableRow key={farmer.farmerId}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            {farmer.farmerName}
                          </TableCell>
                          <TableCell className="sticky left-[100px] bg-background z-10 text-muted-foreground">
                            {farmer.farmerCode}
                          </TableCell>
                          {farmer.dailyHarvest.map((day, index) => {
                            const isHoliday = week.holidays.includes(index);
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
                          Petani
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
                      {week.farmersData.map((farmer) => (
                        <TableRow key={farmer.farmerId}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            {farmer.farmerName}
                          </TableCell>
                          <TableCell className="sticky left-[100px] bg-background z-10 text-muted-foreground">
                            {farmer.farmerCode}
                          </TableCell>
                          {farmer.dailySales.map((day, index) => (
                            <TableCell
                              key={index}
                              className={`text-center ${
                                day.value === 0 ? "text-muted-foreground" : "text-emerald-600 font-medium"
                              }`}
                            >
                              {day.value.toFixed(1)}
                            </TableCell>
                          ))}
                          <TableCell className="text-center font-semibold bg-emerald-500/10">
                            {farmer.totalSales.toFixed(1)}
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
