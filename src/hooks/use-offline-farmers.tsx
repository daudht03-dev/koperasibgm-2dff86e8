import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface OfflineFarmer {
  id: string;
  kode_petani: string;
  nama: string;
  alamat: string;
  created_at: string;
  lands: Array<{
    id: string;
    kode_lahan: string;
    keterangan: string | null;
    created_at: string;
  }>;
  saved_at: string;
}

const STORAGE_KEY = "offline_farmers";

export const useOfflineFarmers = () => {
  const [offlineFarmers, setOfflineFarmers] = useState<OfflineFarmer[]>([]);

  useEffect(() => {
    loadOfflineFarmers();
  }, []);

  const loadOfflineFarmers = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setOfflineFarmers(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading offline farmers:", error);
    }
  };

  const saveFarmer = (farmer: OfflineFarmer) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const existing: OfflineFarmer[] = stored ? JSON.parse(stored) : [];
      
      // Remove existing entry if any
      const filtered = existing.filter(f => f.id !== farmer.id);
      
      // Add new entry with current timestamp
      const updated = [{ ...farmer, saved_at: new Date().toISOString() }, ...filtered];
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setOfflineFarmers(updated);
      
      return true;
    } catch (error) {
      console.error("Error saving farmer:", error);
      return false;
    }
  };

  const getFarmer = (id: string): OfflineFarmer | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const farmers: OfflineFarmer[] = JSON.parse(stored);
        return farmers.find(f => f.id === id) || null;
      }
    } catch (error) {
      console.error("Error getting farmer:", error);
    }
    return null;
  };

  const deleteFarmer = (id: string) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const farmers: OfflineFarmer[] = JSON.parse(stored);
        const filtered = farmers.filter(f => f.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        setOfflineFarmers(filtered);
        return true;
      }
    } catch (error) {
      console.error("Error deleting farmer:", error);
    }
    return false;
  };

  const clearAll = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setOfflineFarmers([]);
      return true;
    } catch (error) {
      console.error("Error clearing farmers:", error);
      return false;
    }
  };

  const syncAllFarmers = async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { success: true, synced: 0 };

      const farmers: OfflineFarmer[] = JSON.parse(stored);
      let syncedCount = 0;

      for (const farmer of farmers) {
        try {
          // Fetch fresh data from database
          const { data: petaniData, error: petaniError } = await supabase
            .from("petani")
            .select("id, kode_petani, nama, alamat, created_at")
            .eq("id", farmer.id)
            .single();

          if (petaniError) throw petaniError;

          // Fetch fresh lands data
          const { data: landsData, error: landsError } = await supabase
            .from("lahan")
            .select("id, kode_lahan, keterangan, created_at")
            .eq("petani_id", farmer.id)
            .order("created_at", { ascending: false });

          if (landsError) throw landsError;

          // Update offline storage with fresh data
          saveFarmer({
            id: petaniData.id,
            kode_petani: petaniData.kode_petani,
            nama: petaniData.nama,
            alamat: petaniData.alamat,
            created_at: petaniData.created_at,
            lands: landsData || [],
            saved_at: new Date().toISOString(),
          });

          syncedCount++;
        } catch (error) {
          console.error(`Error syncing farmer ${farmer.id}:`, error);
        }
      }

      return { success: true, synced: syncedCount };
    } catch (error) {
      console.error("Error syncing farmers:", error);
      return { success: false, synced: 0 };
    }
  };

  return {
    offlineFarmers,
    saveFarmer,
    getFarmer,
    deleteFarmer,
    clearAll,
    syncAllFarmers,
    refetch: loadOfflineFarmers,
  };
};
