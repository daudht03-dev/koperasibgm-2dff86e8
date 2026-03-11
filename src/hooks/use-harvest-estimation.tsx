import { useState, useCallback } from "react";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { naturalSort } from "@/lib/utils";
import { generateProductCode } from "@/lib/product-code";
import type { SalesDisplayMode } from "@/components/HarvestEstimationTable";

export interface FarmerEstimation {
  farmerId: string;
  farmerName: string;
  farmerCode: string;
  averageDaily: number;
  isOrganic: boolean;
  regulasi: string; // "EU", "COR", "EU,COR", or ""
  pengepulId: string;
  pengepulName: string;
}

export interface DailyData {
  date: string;
  value: number;
}

export interface FarmerWeeklyData {
  farmerId: string;
  farmerName: string;
  farmerCode: string;
  dailyHarvest: DailyData[];
  dailySales: DailyData[];
  totalHarvest: number;
  totalSales: number;
  isOrganic: boolean;
  regulasi: string;
  holidays: number[]; // Each farmer has their own holidays
  pengepulId: string;
  pengepulName: string;
  salesBreakdown: Record<number, number[]>; // sale day index -> harvest day indices
}

export interface WeekData {
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  farmersData: FarmerWeeklyData[];
  holidays?: number[]; // Deprecated: kept for backward compatibility, now per-farmer
}

export interface SavedEstimation {
  id: string;
  nama_estimasi: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  data_petani: FarmerEstimation[];
  data_panen: WeekData[];
  data_penjualan: WeekData[];
  catatan: string | null;
  created_at: string;
  updated_at: string;
  pengaturan_petani?: FarmerEstimation[];
}

// Holiday rate configuration type
export interface HolidayRateConfig {
  rate0Days: number; // Rate for 0 holiday days (0-100)
  rate1Day: number;  // Rate for 1 holiday day (0-100)
  rate2Days: number; // Rate for 2 holiday days (0-100)
  rate3Days: number; // Rate for 3 holiday days (0-100)
}

// Holiday mode type
export type HolidayMode = "auto" | "manual" | "percentage";

// Local storage keys
const FARMER_SETTINGS_KEY = "harvest_estimation_farmer_settings";
const HOLIDAY_RATE_KEY = "harvest_estimation_holiday_rates";

// Default holiday rates
const DEFAULT_HOLIDAY_RATES: HolidayRateConfig = {
  rate0Days: 80,
  rate1Day: 15,
  rate2Days: 10,
  rate3Days: 5,
};

export const useHarvestEstimation = () => {
  const { toast } = useToast();
  const [selectedFarmers, setSelectedFarmers] = useState<FarmerEstimation[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [holidayMode, setHolidayMode] = useState<HolidayMode>("auto");
  const [autoHoliday, setAutoHoliday] = useState(true); // Backward compatibility
  const [manualHolidays, setManualHolidays] = useState<number[]>([]);
  const [holidayRates, setHolidayRates] = useState<HolidayRateConfig>(() => {
    const saved = localStorage.getItem(HOLIDAY_RATE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_HOLIDAY_RATES;
      }
    }
    return DEFAULT_HOLIDAY_RATES;
  });
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [batchAverage, setBatchAverage] = useState<number>(5);
  const [savedEstimations, setSavedEstimations] = useState<SavedEstimation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [farmerAverages, setFarmerAverages] = useState<Record<string, number>>({});
  const [isLoadingAverages, setIsLoadingAverages] = useState(false);
  const [salesDisplayMode, setSalesDisplayMode] = useState<SalesDisplayMode>("summary");

  // Generate random number within range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Generate daily harvest value
  const generateDailyHarvest = (average: number, isHoliday: boolean): number => {
    if (isHoliday) return 0;
    const variation = randomInRange(-1.9, 1.9);
    return Math.max(0, Math.round((average + variation) * 10) / 10);
  };

  // Generate random holidays (0-3 days) based on mode
  const generateRandomHolidays = useCallback((): number[] => {
    let holidayCount: number;
    
    if (holidayMode === "percentage") {
      // Gacha system based on rates
      const totalRate = holidayRates.rate0Days + holidayRates.rate1Day + holidayRates.rate2Days + holidayRates.rate3Days;
      const roll = Math.random() * totalRate;
      
      if (roll < holidayRates.rate0Days) {
        holidayCount = 0;
      } else if (roll < holidayRates.rate0Days + holidayRates.rate1Day) {
        holidayCount = 1;
      } else if (roll < holidayRates.rate0Days + holidayRates.rate1Day + holidayRates.rate2Days) {
        holidayCount = 2;
      } else {
        holidayCount = 3;
      }
    } else {
      // Original random (0-3 days with equal probability)
      holidayCount = Math.floor(Math.random() * 4);
    }
    
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const shuffled = allDays.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, holidayCount).sort((a, b) => a - b);
  }, [holidayMode, holidayRates]);

  // Save holiday rates to localStorage
  const saveHolidayRates = useCallback((rates: HolidayRateConfig) => {
    setHolidayRates(rates);
    localStorage.setItem(HOLIDAY_RATE_KEY, JSON.stringify(rates));
    toast({
      title: "Pengaturan disimpan",
      description: "Rate hari libur berhasil disimpan.",
    });
  }, [toast]);

  // Load farmer averages from existing penjualan_petani data
  const loadFarmerAverages = useCallback(async () => {
    setIsLoadingAverages(true);
    try {
      const { data, error } = await supabase
        .from("penjualan_petani")
        .select("petani_id, jumlah_kg");

      if (error) throw error;

      // Calculate average per farmer
      const farmerTotals: Record<string, { total: number; count: number }> = {};
      
      data?.forEach((sale) => {
        if (!farmerTotals[sale.petani_id]) {
          farmerTotals[sale.petani_id] = { total: 0, count: 0 };
        }
        farmerTotals[sale.petani_id].total += Number(sale.jumlah_kg);
        farmerTotals[sale.petani_id].count += 1;
      });

      const averages: Record<string, number> = {};
      Object.entries(farmerTotals).forEach(([farmerId, { total, count }]) => {
        averages[farmerId] = Math.round((total / count) * 10) / 10;
      });

      setFarmerAverages(averages);
      
      toast({
        title: "Data dimuat",
        description: `Berhasil memuat rata-rata panen dari ${Object.keys(averages).length} petani.`,
      });
      
      return averages;
    } catch (error) {
      console.error("Error loading farmer averages:", error);
      toast({
        title: "Gagal memuat",
        description: "Terjadi kesalahan saat memuat data rata-rata panen.",
        variant: "destructive",
      });
      return {};
    } finally {
      setIsLoadingAverages(false);
    }
  }, [toast]);

  // Apply loaded averages to selected farmers
  const applyLoadedAverages = useCallback(() => {
    if (Object.keys(farmerAverages).length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Muat data rata-rata panen terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    let appliedCount = 0;
    const updatedFarmers = selectedFarmers.map(farmer => {
      const avg = farmerAverages[farmer.farmerId];
      if (avg !== undefined) {
        appliedCount++;
        return { ...farmer, averageDaily: avg };
      }
      return farmer;
    });

    setSelectedFarmers(updatedFarmers);
    
    toast({
      title: "Rata-rata diterapkan",
      description: `Berhasil menerapkan rata-rata ke ${appliedCount} dari ${selectedFarmers.length} petani.`,
    });
  }, [farmerAverages, selectedFarmers, toast]);

  // Generate sales pattern based on harvest data
  // Pattern: random grouping (single day, 2 days sum, 3 days sum)
  // Returns { salesData, breakdown } where breakdown maps sale day index to harvest day indices
  const generateSalesFromHarvest = (harvestData: DailyData[]): { salesData: DailyData[]; breakdown: Record<number, number[]> } => {
    const salesData: DailyData[] = harvestData.map(h => ({ date: h.date, value: 0 }));
    const breakdown: Record<number, number[]> = {};
    let dayIndex = 0;

    while (dayIndex < 7) {
      // Random pattern: 0 = single day, 1 = 2 days sum, 2 = 3 days sum
      const pattern = Math.floor(Math.random() * 3);
      const daysToSum = pattern + 1;

      let sum = 0;
      const contributingDays: number[] = [];

      for (let i = 0; i < daysToSum && dayIndex + i < 7; i++) {
        const currentValue = harvestData[dayIndex + i]?.value || 0;
        sum += currentValue;
        if (currentValue > 0) {
          contributingDays.push(dayIndex + i);
        }
      }

      // Display sum at the last day of the group
      const displayDay = Math.min(dayIndex + daysToSum - 1, 6);
      if (sum > 0) {
        salesData[displayDay].value = Math.round(sum * 10) / 10;
        breakdown[displayDay] = contributingDays;
      }

      dayIndex += daysToSum;
    }

    return { salesData, breakdown };
  };

  // Generate week data for all selected farmers - each farmer gets unique random holidays
  const generateWeekData = useCallback((
    farmers: FarmerEstimation[],
    weekStartDate: Date,
    weekIndex: number,
    globalHolidayIndices?: number[] // Only used for manual mode
  ): WeekData => {
    const farmersData: FarmerWeeklyData[] = farmers.map(farmer => {
      // Each farmer gets their own random holidays (in auto mode)
      const farmerHolidays = globalHolidayIndices !== undefined 
        ? globalHolidayIndices 
        : generateRandomHolidays();
      
      const dailyHarvest: DailyData[] = [];

      // Generate 7 days of harvest data
      for (let day = 0; day < 7; day++) {
        const date = addDays(weekStartDate, day);
        const isHoliday = farmerHolidays.includes(day);
        const value = generateDailyHarvest(farmer.averageDaily, isHoliday);

        dailyHarvest.push({
          date: format(date, "yyyy-MM-dd"),
          value,
        });
      }

      // Generate sales based on harvest
      const { salesData: dailySales, breakdown: salesBreakdown } = generateSalesFromHarvest(dailyHarvest);

      return {
        farmerId: farmer.farmerId,
        farmerName: farmer.farmerName,
        farmerCode: farmer.farmerCode,
        dailyHarvest,
        dailySales,
        totalHarvest: dailyHarvest.reduce((sum, d) => sum + d.value, 0),
        totalSales: dailySales.reduce((sum, d) => sum + d.value, 0),
        isOrganic: farmer.isOrganic,
        regulasi: farmer.regulasi || "",
        holidays: farmerHolidays,
        pengepulId: farmer.pengepulId || "",
        pengepulName: farmer.pengepulName || "",
        salesBreakdown,
      };
    });

    return {
      weekIndex,
      startDate: weekStartDate,
      endDate: addDays(weekStartDate, 6),
      farmersData,
    };
  }, [generateRandomHolidays]);

  // Main generate function
  const generateEstimation = useCallback(() => {
    if (selectedFarmers.length === 0) return;

    // Pass manual holidays only if in manual mode, otherwise each farmer gets random holidays
    const globalHolidays = holidayMode === "manual" ? manualHolidays : undefined;
    const weekData = generateWeekData(selectedFarmers, startDate, 0, globalHolidays);

    setWeeklyData([weekData]);
  }, [selectedFarmers, startDate, holidayMode, manualHolidays, generateWeekData]);

  // Refresh all data (both harvest and sales)
  const refreshAll = useCallback(() => {
    if (selectedFarmers.length === 0 || weeklyData.length === 0) return;

    const newWeeklyData = weeklyData.map((week) => {
      const globalHolidays = holidayMode === "manual" ? manualHolidays : undefined;
      return generateWeekData(selectedFarmers, week.startDate, week.weekIndex, globalHolidays);
    });

    setWeeklyData(newWeeklyData);
  }, [selectedFarmers, weeklyData, holidayMode, manualHolidays, generateWeekData]);

  // Refresh only harvest data (sales will also be regenerated based on new harvest)
  const refreshHarvest = useCallback(() => {
    refreshAll();
  }, [refreshAll]);

  // Refresh only sales data (keep harvest, regenerate sales pattern)
  const refreshSales = useCallback(() => {
    if (weeklyData.length === 0) return;

    const newWeeklyData = weeklyData.map((week) => ({
      ...week,
      farmersData: week.farmersData.map(farmer => {
        const { salesData: newDailySales, breakdown: newBreakdown } = generateSalesFromHarvest(farmer.dailyHarvest);
        return {
          ...farmer,
          dailySales: newDailySales,
          totalSales: newDailySales.reduce((sum, d) => sum + d.value, 0),
          salesBreakdown: newBreakdown,
        };
      }),
    }));

    setWeeklyData(newWeeklyData);
  }, [weeklyData]);

  // Add next week
  const addNextWeek = useCallback(() => {
    if (selectedFarmers.length === 0 || weeklyData.length === 0) return;

    const lastWeek = weeklyData[weeklyData.length - 1];
    const newStartDate = addDays(lastWeek.endDate, 1);
    const globalHolidays = holidayMode === "manual" ? manualHolidays : undefined;
    const newWeek = generateWeekData(
      selectedFarmers,
      newStartDate,
      lastWeek.weekIndex + 1,
      globalHolidays
    );

    setWeeklyData(prev => [...prev, newWeek]);
  }, [selectedFarmers, weeklyData, holidayMode, manualHolidays, generateWeekData]);

  // Refresh specific week
  const refreshWeek = useCallback((weekIndex: number, type: 'all' | 'harvest' | 'sales') => {
    setWeeklyData(prev => prev.map(week => {
      if (week.weekIndex !== weekIndex) return week;

      if (type === 'sales') {
        return {
          ...week,
          farmersData: week.farmersData.map(farmer => {
            const { salesData: newDailySales, breakdown: newBreakdown } = generateSalesFromHarvest(farmer.dailyHarvest);
            return {
              ...farmer,
              dailySales: newDailySales,
              totalSales: newDailySales.reduce((sum, d) => sum + d.value, 0),
              salesBreakdown: newBreakdown,
            };
          }),
        };
      }

      // Regenerate entire week for 'all' or 'harvest' - each farmer gets new random holidays
      const globalHolidays = holidayMode === "manual" ? manualHolidays : undefined;
      return generateWeekData(selectedFarmers, week.startDate, week.weekIndex, globalHolidays);
    }));
  }, [holidayMode, manualHolidays, selectedFarmers, generateWeekData]);

  // Remove week
  const removeWeek = useCallback((weekIndex: number) => {
    setWeeklyData(prev => prev.filter(week => week.weekIndex !== weekIndex));
  }, []);

  // Clear all data
  const clearAll = useCallback(() => {
    setWeeklyData([]);
  }, []);

  // Update farmer average
  const updateFarmerAverage = useCallback((farmerId: string, average: number) => {
    setSelectedFarmers(prev => prev.map(farmer => 
      farmer.farmerId === farmerId ? { ...farmer, averageDaily: average } : farmer
    ));
  }, []);

  // Set batch average for all selected farmers
  const applyBatchAverage = useCallback(() => {
    setSelectedFarmers(prev => prev.map(farmer => ({
      ...farmer,
      averageDaily: batchAverage,
    })));
  }, [batchAverage]);

  // Export to CSV with proper number format for spreadsheets
  const exportToCSV = useCallback(() => {
    if (weeklyData.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Generate estimasi terlebih dahulu sebelum export.",
        variant: "destructive",
      });
      return;
    }

    const rows: string[] = [];
    const SEP = ";";
    const fmtNum = (n: number) => n.toFixed(1).replace(".", ",");
    
    weeklyData.forEach((week) => {
      // Sort farmers by pengepul first, then by code
      const sortedFarmersData = [...week.farmersData].sort((a, b) => {
        const pA = a.pengepulName || "zzz";
        const pB = b.pengepulName || "zzz";
        if (pA !== pB) return pA.localeCompare(pB);
        return naturalSort(a.farmerCode, b.farmerCode);
      });
      
      rows.push(`Minggu ${week.weekIndex + 1}: ${format(week.startDate, "dd/MM/yyyy")} - ${format(week.endDate, "dd/MM/yyyy")}`);
      rows.push("");
      
      // Harvest table
      const harvestHeader = ["Nama Petani", "Kode", "Status", "Regulasi", "Pengepul"];
      for (let i = 0; i < 7; i++) {
        harvestHeader.push(format(addDays(week.startDate, i), "dd/MM"));
      }
      harvestHeader.push("Total Panen");
      rows.push("ESTIMASI PANEN");
      rows.push(harvestHeader.join(SEP));
      
      sortedFarmersData.forEach(farmer => {
        const row = [
          `"${farmer.farmerName}"`,
          farmer.farmerCode,
          farmer.isOrganic ? "Organik" : "Konvensional",
          farmer.regulasi || "-",
          `"${farmer.pengepulName || "-"}"`,
          ...farmer.dailyHarvest.map(d => fmtNum(d.value)),
          fmtNum(farmer.totalHarvest),
        ];
        rows.push(row.join(SEP));
      });
      
      const harvestTotals = ["TOTAL", "", "", "", ""];
      for (let i = 0; i < 7; i++) {
        const dayTotal = sortedFarmersData.reduce((sum, f) => sum + (f.dailyHarvest[i]?.value || 0), 0);
        harvestTotals.push(fmtNum(dayTotal));
      }
      harvestTotals.push(fmtNum(sortedFarmersData.reduce((sum, f) => sum + f.totalHarvest, 0)));
      rows.push(harvestTotals.join(SEP));
      rows.push("");
      
      // Sales table with breakdown and pengepul column
      const salesHeader = ["Nama Petani", "Kode", "Status", "Regulasi"];
      for (let i = 0; i < 7; i++) {
        salesHeader.push(format(addDays(week.startDate, i), "dd/MM"));
      }
      salesHeader.push("Total Penjualan", "Pengepul", "Total");
      rows.push("ESTIMASI PENJUALAN");
      rows.push(salesHeader.join(SEP));
      
      // Track pengepul subtotals
      const pengepulTotals = new Map<string, number>();
      
      sortedFarmersData.forEach(farmer => {
        const pengepulName = farmer.pengepulName || "-";
        pengepulTotals.set(pengepulName, (pengepulTotals.get(pengepulName) || 0) + farmer.totalSales);
        
        const row = [
          `"${farmer.farmerName}"`,
          farmer.farmerCode,
          farmer.isOrganic ? "Organik" : "Konvensional",
          farmer.regulasi || "-",
        ];
        
        // Sales cells - pipe-separated for multi-day harvest sales
        for (let i = 0; i < 7; i++) {
          const saleValue = farmer.dailySales[i]?.value || 0;
          const contributingDays = farmer.salesBreakdown?.[i] || [];
          
          if (saleValue > 0 && contributingDays.length > 1) {
            const pipeStr = contributingDays
              .map(dayIdx => fmtNum(farmer.dailyHarvest[dayIdx]?.value || 0))
              .join("|");
            row.push(`"${pipeStr}"`);
          } else {
            row.push(fmtNum(saleValue));
          }
        }
        
        row.push(fmtNum(farmer.totalSales));
        row.push(`"${pengepulName}"`);
        row.push(fmtNum(farmer.totalSales));
        rows.push(row.join(SEP));
      });
      
      // Sales total row
      const salesTotals = ["TOTAL", "", "", ""];
      for (let i = 0; i < 7; i++) {
        const dayTotal = sortedFarmersData.reduce((sum, f) => sum + (f.dailySales[i]?.value || 0), 0);
        salesTotals.push(fmtNum(dayTotal));
      }
      const grandTotal = sortedFarmersData.reduce((sum, f) => sum + f.totalSales, 0);
      salesTotals.push(fmtNum(grandTotal), "", fmtNum(grandTotal));
      rows.push(salesTotals.join(SEP));
      
      // Per-pengepul subtotals
      if (pengepulTotals.size > 0) {
        rows.push("");
        rows.push("REKAP PER PENGEPUL");
        rows.push(["Pengepul", "Total (Kg)"].join(SEP));
        pengepulTotals.forEach((total, name) => {
          rows.push([`"${name}"`, fmtNum(total)].join(SEP));
        });
      }
      
      rows.push("");
      rows.push("");
    });

    const csvContent = rows.join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `estimasi-panen-${format(new Date(), "yyyy-MM-dd-HHmmss")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export berhasil",
      description: "Data estimasi telah diunduh sebagai CSV.",
    });
  }, [weeklyData, toast]);

  // Save to database
  const saveToDatabase = useCallback(async (name: string, notes?: string) => {
    if (weeklyData.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Generate estimasi terlebih dahulu sebelum menyimpan.",
        variant: "destructive",
      });
      return false;
    }

    setIsSaving(true);
    try {
      const firstWeek = weeklyData[0];
      const lastWeek = weeklyData[weeklyData.length - 1];

      // Convert Date objects to ISO strings for JSON storage
      const serializableWeeklyData = weeklyData.map(week => ({
        ...week,
        startDate: week.startDate.toISOString(),
        endDate: week.endDate.toISOString(),
      }));

      const insertData = {
        nama_estimasi: name,
        tanggal_mulai: format(firstWeek.startDate, "yyyy-MM-dd"),
        tanggal_selesai: format(lastWeek.endDate, "yyyy-MM-dd"),
        data_petani: selectedFarmers as unknown as Record<string, unknown>,
        data_panen: serializableWeeklyData as unknown as Record<string, unknown>,
        data_penjualan: serializableWeeklyData as unknown as Record<string, unknown>,
        pengaturan_petani: selectedFarmers as unknown as Record<string, unknown>,
        catatan: notes || null,
      };

      const { error } = await supabase.from("estimasi_panen").insert(insertData as never);
      if (error) throw error;

      toast({
        title: "Berhasil disimpan",
        description: `Estimasi "${name}" telah disimpan ke database.`,
      });
      
      return true;
    } catch (error) {
      console.error("Error saving estimation:", error);
      toast({
        title: "Gagal menyimpan",
        description: "Terjadi kesalahan saat menyimpan data.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [weeklyData, selectedFarmers, toast]);

  // Load saved estimations
  const loadSavedEstimations = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("estimasi_panen")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSavedEstimations(data as unknown as SavedEstimation[]);
    } catch (error) {
      console.error("Error loading estimations:", error);
      toast({
        title: "Gagal memuat",
        description: "Terjadi kesalahan saat memuat data tersimpan.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Load specific estimation
  const loadEstimation = useCallback((estimation: SavedEstimation) => {
    try {
      const farmers = estimation.data_petani as FarmerEstimation[];
      setSelectedFarmers(farmers);
      
      // Parse the weekly data and convert date strings back to Date objects
      const panenData = estimation.data_panen as unknown as Array<{
        weekIndex: number;
        startDate: string;
        endDate: string;
        farmersData: FarmerWeeklyData[];
        holidays: number[];
      }>;
      
      const parsedWeeklyData: WeekData[] = panenData.map(week => ({
        ...week,
        startDate: new Date(week.startDate),
        endDate: new Date(week.endDate),
      }));
      
      setWeeklyData(parsedWeeklyData);
      
      if (parsedWeeklyData.length > 0) {
        setStartDate(parsedWeeklyData[0].startDate);
      }

      toast({
        title: "Data dimuat",
        description: `Estimasi "${estimation.nama_estimasi}" telah dimuat.`,
      });
    } catch (error) {
      console.error("Error parsing estimation:", error);
      toast({
        title: "Gagal memuat",
        description: "Format data tidak valid.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Delete estimation
  const deleteEstimation = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("estimasi_panen").delete().eq("id", id);
      if (error) throw error;

      setSavedEstimations(prev => prev.filter(e => e.id !== id));
      toast({
        title: "Berhasil dihapus",
        description: "Data estimasi telah dihapus.",
      });
    } catch (error) {
      console.error("Error deleting estimation:", error);
      toast({
        title: "Gagal menghapus",
        description: "Terjadi kesalahan saat menghapus data.",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    // State
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
    weeklyData,
    batchAverage,
    setBatchAverage,
    savedEstimations,
    isSaving,
    isLoading,
    farmerAverages,
    isLoadingAverages,

    // Actions
    generateEstimation,
    refreshAll,
    refreshHarvest,
    refreshSales,
    addNextWeek,
    refreshWeek,
    removeWeek,
    clearAll,
    updateFarmerAverage,
    applyBatchAverage,
    exportToCSV,
    saveToDatabase,
    loadSavedEstimations,
    loadEstimation,
    deleteEstimation,
    saveHolidayRates,
    loadFarmerAverages,
    applyLoadedAverages,
  };
};
