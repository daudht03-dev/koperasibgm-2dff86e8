import { useState, useEffect } from "react";

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

  return {
    offlineFarmers,
    saveFarmer,
    getFarmer,
    deleteFarmer,
    clearAll,
    refetch: loadOfflineFarmers,
  };
};
