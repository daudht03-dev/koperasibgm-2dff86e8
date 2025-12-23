import { useState, useCallback } from "react";
import { format, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FarmerEstimation {
  farmerId: string;
  farmerName: string;
  farmerCode: string;
  averageDaily: number;
  isOrganic: boolean;
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
  holidays: number[]; // Each farmer has their own holidays
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

// Local storage key for farmer settings
const FARMER_SETTINGS_KEY = "harvest_estimation_farmer_settings";

export const useHarvestEstimation = () => {
  const { toast } = useToast();
  const [selectedFarmers, setSelectedFarmers] = useState<FarmerEstimation[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [autoHoliday, setAutoHoliday] = useState(true);
  const [manualHolidays, setManualHolidays] = useState<number[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [batchAverage, setBatchAverage] = useState<number>(5);
  const [savedEstimations, setSavedEstimations] = useState<SavedEstimation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  // Generate random holidays (0-3 days)
  const generateRandomHolidays = (): number[] => {
    const holidayCount = Math.floor(Math.random() * 4); // 0-3 days
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const shuffled = allDays.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, holidayCount).sort((a, b) => a - b);
  };

  // Generate sales pattern based on harvest data
  // Pattern: random grouping (single day, 2 days sum, 3 days sum)
  const generateSalesFromHarvest = (harvestData: DailyData[]): DailyData[] => {
    const salesData: DailyData[] = harvestData.map(h => ({ date: h.date, value: 0 }));
    let dayIndex = 0;

    while (dayIndex < 7) {
      // Random pattern: 0 = single day, 1 = 2 days sum, 2 = 3 days sum
      const pattern = Math.floor(Math.random() * 3);
      const daysToSum = pattern + 1;

      let sum = 0;
      let lastNonZeroIndex = dayIndex;

      for (let i = 0; i < daysToSum && dayIndex + i < 7; i++) {
        const currentValue = harvestData[dayIndex + i]?.value || 0;
        sum += currentValue;
        if (currentValue > 0) {
          lastNonZeroIndex = dayIndex + i;
        }
      }

      // Display sum at the last day of the group (or last day with value)
      const displayDay = Math.min(dayIndex + daysToSum - 1, 6);
      if (sum > 0) {
        salesData[displayDay].value = Math.round(sum * 10) / 10;
      }

      dayIndex += daysToSum;
    }

    return salesData;
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
      const dailySales = generateSalesFromHarvest(dailyHarvest);

      return {
        farmerId: farmer.farmerId,
        farmerName: farmer.farmerName,
        farmerCode: farmer.farmerCode,
        dailyHarvest,
        dailySales,
        totalHarvest: dailyHarvest.reduce((sum, d) => sum + d.value, 0),
        totalSales: dailySales.reduce((sum, d) => sum + d.value, 0),
        isOrganic: farmer.isOrganic,
        holidays: farmerHolidays,
      };
    });

    return {
      weekIndex,
      startDate: weekStartDate,
      endDate: addDays(weekStartDate, 6),
      farmersData,
    };
  }, []);

  // Main generate function
  const generateEstimation = useCallback(() => {
    if (selectedFarmers.length === 0) return;

    // Pass manual holidays only if not in auto mode, otherwise each farmer gets random holidays
    const globalHolidays = autoHoliday ? undefined : manualHolidays;
    const weekData = generateWeekData(selectedFarmers, startDate, 0, globalHolidays);

    setWeeklyData([weekData]);
  }, [selectedFarmers, startDate, autoHoliday, manualHolidays, generateWeekData]);

  // Refresh all data (both harvest and sales)
  const refreshAll = useCallback(() => {
    if (selectedFarmers.length === 0 || weeklyData.length === 0) return;

    const newWeeklyData = weeklyData.map((week) => {
      const globalHolidays = autoHoliday ? undefined : manualHolidays;
      return generateWeekData(selectedFarmers, week.startDate, week.weekIndex, globalHolidays);
    });

    setWeeklyData(newWeeklyData);
  }, [selectedFarmers, weeklyData, autoHoliday, manualHolidays, generateWeekData]);

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
        const newDailySales = generateSalesFromHarvest(farmer.dailyHarvest);
        return {
          ...farmer,
          dailySales: newDailySales,
          totalSales: newDailySales.reduce((sum, d) => sum + d.value, 0),
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
    const globalHolidays = autoHoliday ? undefined : manualHolidays;
    const newWeek = generateWeekData(
      selectedFarmers,
      newStartDate,
      lastWeek.weekIndex + 1,
      globalHolidays
    );

    setWeeklyData(prev => [...prev, newWeek]);
  }, [selectedFarmers, weeklyData, autoHoliday, manualHolidays, generateWeekData]);

  // Refresh specific week
  const refreshWeek = useCallback((weekIndex: number, type: 'all' | 'harvest' | 'sales') => {
    setWeeklyData(prev => prev.map(week => {
      if (week.weekIndex !== weekIndex) return week;

      if (type === 'sales') {
        return {
          ...week,
          farmersData: week.farmersData.map(farmer => {
            const newDailySales = generateSalesFromHarvest(farmer.dailyHarvest);
            return {
              ...farmer,
              dailySales: newDailySales,
              totalSales: newDailySales.reduce((sum, d) => sum + d.value, 0),
            };
          }),
        };
      }

      // Regenerate entire week for 'all' or 'harvest' - each farmer gets new random holidays
      const globalHolidays = autoHoliday ? undefined : manualHolidays;
      return generateWeekData(selectedFarmers, week.startDate, week.weekIndex, globalHolidays);
    }));
  }, [autoHoliday, manualHolidays, selectedFarmers, generateWeekData]);

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
    
    // Use semicolon as separator for better Excel compatibility with numbers
    const SEP = ";";
    
    weeklyData.forEach((week) => {
      // Add week header
      rows.push(`Minggu ${week.weekIndex + 1}: ${format(week.startDate, "dd/MM/yyyy")} - ${format(week.endDate, "dd/MM/yyyy")}`);
      rows.push("");
      
      // Harvest table header
      const harvestHeader = ["Nama Petani", "Kode", "Status"];
      for (let i = 0; i < 7; i++) {
        harvestHeader.push(format(addDays(week.startDate, i), "dd/MM"));
      }
      harvestHeader.push("Total Panen");
      rows.push("ESTIMASI PANEN");
      rows.push(harvestHeader.join(SEP));
      
      // Harvest data - numbers with 1 decimal place for proper spreadsheet recognition
      week.farmersData.forEach(farmer => {
        const row = [
          `"${farmer.farmerName}"`,
          farmer.farmerCode,
          farmer.isOrganic ? "Organik" : "Konvensional",
          ...farmer.dailyHarvest.map(d => d.value.toFixed(1).replace(".", ",")), // Use comma as decimal for EU/ID locale
          farmer.totalHarvest.toFixed(1).replace(".", ","),
        ];
        rows.push(row.join(SEP));
      });
      
      // Harvest total row
      const harvestTotals = ["TOTAL", "", ""];
      for (let i = 0; i < 7; i++) {
        const dayTotal = week.farmersData.reduce((sum, f) => sum + (f.dailyHarvest[i]?.value || 0), 0);
        harvestTotals.push(dayTotal.toFixed(1).replace(".", ","));
      }
      harvestTotals.push(week.farmersData.reduce((sum, f) => sum + f.totalHarvest, 0).toFixed(1).replace(".", ","));
      rows.push(harvestTotals.join(SEP));
      rows.push("");
      
      // Sales table header
      const salesHeader = ["Nama Petani", "Kode", "Status"];
      for (let i = 0; i < 7; i++) {
        salesHeader.push(format(addDays(week.startDate, i), "dd/MM"));
      }
      salesHeader.push("Total Penjualan");
      rows.push("ESTIMASI PENJUALAN");
      rows.push(salesHeader.join(SEP));
      
      // Sales data - numbers with 1 decimal place
      week.farmersData.forEach(farmer => {
        const row = [
          `"${farmer.farmerName}"`,
          farmer.farmerCode,
          farmer.isOrganic ? "Organik" : "Konvensional",
          ...farmer.dailySales.map(d => d.value.toFixed(1).replace(".", ",")),
          farmer.totalSales.toFixed(1).replace(".", ","),
        ];
        rows.push(row.join(SEP));
      });
      
      // Sales total row
      const salesTotals = ["TOTAL", "", ""];
      for (let i = 0; i < 7; i++) {
        const dayTotal = week.farmersData.reduce((sum, f) => sum + (f.dailySales[i]?.value || 0), 0);
        salesTotals.push(dayTotal.toFixed(1).replace(".", ","));
      }
      salesTotals.push(week.farmersData.reduce((sum, f) => sum + f.totalSales, 0).toFixed(1).replace(".", ","));
      rows.push(salesTotals.join(SEP));
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
    manualHolidays,
    setManualHolidays,
    weeklyData,
    batchAverage,
    setBatchAverage,
    savedEstimations,
    isSaving,
    isLoading,

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
  };
};
