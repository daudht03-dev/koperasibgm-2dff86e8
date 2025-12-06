import { useState, useCallback } from "react";
import { format, addDays } from "date-fns";

export interface FarmerEstimation {
  farmerId: string;
  farmerName: string;
  farmerCode: string;
  averageDaily: number;
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
}

export interface WeekData {
  weekIndex: number;
  startDate: Date;
  endDate: Date;
  farmersData: FarmerWeeklyData[];
  holidays: number[]; // 0-6 representing day index within week
}

export const useHarvestEstimation = () => {
  const [selectedFarmers, setSelectedFarmers] = useState<FarmerEstimation[]>([]);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [autoHoliday, setAutoHoliday] = useState(true);
  const [manualHolidays, setManualHolidays] = useState<number[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [batchAverage, setBatchAverage] = useState<number>(5);

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

  // Generate week data for all selected farmers
  const generateWeekData = useCallback((
    farmers: FarmerEstimation[],
    weekStartDate: Date,
    weekIndex: number,
    holidayIndices: number[]
  ): WeekData => {
    const farmersData: FarmerWeeklyData[] = farmers.map(farmer => {
      const dailyHarvest: DailyData[] = [];

      // Generate 7 days of harvest data
      for (let day = 0; day < 7; day++) {
        const date = addDays(weekStartDate, day);
        const isHoliday = holidayIndices.includes(day);
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
      };
    });

    return {
      weekIndex,
      startDate: weekStartDate,
      endDate: addDays(weekStartDate, 6),
      farmersData,
      holidays: holidayIndices,
    };
  }, []);

  // Main generate function
  const generateEstimation = useCallback(() => {
    if (selectedFarmers.length === 0) return;

    const holidays = autoHoliday ? generateRandomHolidays() : manualHolidays;
    const weekData = generateWeekData(selectedFarmers, startDate, 0, holidays);

    setWeeklyData([weekData]);
  }, [selectedFarmers, startDate, autoHoliday, manualHolidays, generateWeekData]);

  // Refresh all data (both harvest and sales)
  const refreshAll = useCallback(() => {
    if (selectedFarmers.length === 0 || weeklyData.length === 0) return;

    const newWeeklyData = weeklyData.map((week) => {
      const holidays = autoHoliday ? generateRandomHolidays() : manualHolidays;
      return generateWeekData(selectedFarmers, week.startDate, week.weekIndex, holidays);
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
    const holidays = autoHoliday ? generateRandomHolidays() : manualHolidays;
    const newWeek = generateWeekData(
      selectedFarmers,
      newStartDate,
      lastWeek.weekIndex + 1,
      holidays
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

      // Regenerate entire week for 'all' or 'harvest'
      const holidays = autoHoliday ? generateRandomHolidays() : manualHolidays;
      return generateWeekData(selectedFarmers, week.startDate, week.weekIndex, holidays);
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
  };
};
