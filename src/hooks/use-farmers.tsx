import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type Farmer = Tables<"petani">;
type FarmerInsert = TablesInsert<"petani">;
type FarmerUpdate = TablesUpdate<"petani">;

export const useFarmers = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("petani")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching farmers:", error);
        toast({
          title: "Error",
          description: "Gagal memuat data petani",
          variant: "destructive",
        });
        return;
      }

      setFarmers(data || []);
    } catch (error) {
      console.error("Error fetching farmers:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data petani",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addFarmer = async (farmer: FarmerInsert) => {
    try {
      const { data, error } = await supabase
        .from("petani")
        .insert(farmer)
        .select()
        .single();

      if (error) {
        console.error("Error adding farmer:", error);
        toast({
          title: "Error",
          description: "Gagal menambahkan petani",
          variant: "destructive",
        });
        return null;
      }

      setFarmers(prev => [data, ...prev]);
      toast({
        title: "Berhasil",
        description: "Petani berhasil ditambahkan",
      });
      return data;
    } catch (error) {
      console.error("Error adding farmer:", error);
      toast({
        title: "Error",
        description: "Gagal menambahkan petani",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateFarmer = async (id: string, farmer: FarmerUpdate) => {
    try {
      const { data, error } = await supabase
        .from("petani")
        .update(farmer)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating farmer:", error);
        toast({
          title: "Error",
          description: "Gagal mengupdate petani",
          variant: "destructive",
        });
        return false;
      }

      setFarmers(prev => prev.map(f => f.id === id ? data : f));
      toast({
        title: "Berhasil",
        description: "Petani berhasil diupdate",
      });
      return true;
    } catch (error) {
      console.error("Error updating farmer:", error);
      toast({
        title: "Error",
        description: "Gagal mengupdate petani",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteFarmer = async (id: string) => {
    try {
      const { error } = await supabase
        .from("petani")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting farmer:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus petani",
          variant: "destructive",
        });
        return false;
      }

      setFarmers(prev => prev.filter(f => f.id !== id));
      toast({
        title: "Berhasil",
        description: "Petani berhasil dihapus",
      });
      return true;
    } catch (error) {
      console.error("Error deleting farmer:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus petani",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchFarmers();
  }, []);

  return {
    farmers,
    loading,
    addFarmer,
    updateFarmer,
    deleteFarmer,
    refetch: fetchFarmers,
  };
};