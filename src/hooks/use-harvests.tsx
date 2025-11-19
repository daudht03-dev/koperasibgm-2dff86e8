import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Harvest {
  id: string;
  lahan_id: string;
  tanggal_panen: string;
  jumlah_kg: number;
  keterangan: string | null;
  created_at: string;
}

interface HarvestInsert {
  lahan_id: string;
  tanggal_panen: string;
  jumlah_kg: number;
  keterangan?: string | null;
}

export const useHarvests = () => {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHarvests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("panen")
        .select("*")
        .order("tanggal_panen", { ascending: false });

      if (error) {
        console.error("Error fetching harvests:", error);
        toast({
          title: "Error",
          description: "Gagal memuat data panen",
          variant: "destructive",
        });
        return;
      }

      setHarvests(data || []);
    } catch (error) {
      console.error("Error fetching harvests:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data panen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addHarvest = async (harvest: HarvestInsert) => {
    try {
      const { data, error } = await supabase
        .from("panen")
        .insert(harvest)
        .select()
        .single();

      if (error) {
        console.error("Error adding harvest:", error);
        toast({
          title: "Error",
          description: "Gagal menambahkan data panen",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setHarvests(prev => [data, ...prev]);
        toast({
          title: "Berhasil",
          description: "Data panen berhasil ditambahkan",
        });
      }
      return true;
    } catch (error) {
      console.error("Error adding harvest:", error);
      toast({
        title: "Error",
        description: "Gagal menambahkan data panen",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteHarvest = async (id: string) => {
    try {
      const { error } = await supabase
        .from("panen")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting harvest:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus data panen",
          variant: "destructive",
        });
        return false;
      }

      setHarvests(prev => prev.filter(h => h.id !== id));
      toast({
        title: "Berhasil",
        description: "Data panen berhasil dihapus",
      });
      return true;
    } catch (error) {
      console.error("Error deleting harvest:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus data panen",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchHarvests();
  }, []);

  return {
    harvests,
    loading,
    addHarvest,
    deleteHarvest,
    refetch: fetchHarvests,
  };
};