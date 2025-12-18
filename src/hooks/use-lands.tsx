import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type Land = Tables<"lahan">;
type LandInsert = TablesInsert<"lahan">;
type LandUpdate = TablesUpdate<"lahan">;

export const useLands = () => {
  const [lands, setLands] = useState<Land[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLands = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lahan")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching lands:", error);
        toast({
          title: "Error",
          description: "Gagal memuat data lahan",
          variant: "destructive",
        });
        return;
      }

      setLands(data || []);
    } catch (error) {
      console.error("Error fetching lands:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data lahan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const addLand = async (land: LandInsert) => {
    try {
      const { data, error } = await supabase
        .from("lahan")
        .insert(land)
        .select()
        .single();

      if (error) {
        console.error("Error adding land:", error);
        toast({
          title: "Error",
          description: "Gagal menambahkan lahan",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setLands(prev => [data, ...prev]);
        toast({
          title: "Berhasil",
          description: "Lahan berhasil ditambahkan",
        });
      }
      return true;
    } catch (error) {
      console.error("Error adding land:", error);
      toast({
        title: "Error",
        description: "Gagal menambahkan lahan",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateLand = async (id: string, land: LandUpdate) => {
    try {
      const { data, error } = await supabase
        .from("lahan")
        .update(land)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating land:", error);
        toast({
          title: "Error",
          description: "Gagal mengupdate lahan",
          variant: "destructive",
        });
        return false;
      }

      setLands(prev => prev.map(l => l.id === id ? data : l));
      toast({
        title: "Berhasil",
        description: "Lahan berhasil diupdate",
      });
      return true;
    } catch (error) {
      console.error("Error updating land:", error);
      toast({
        title: "Error",
        description: "Gagal mengupdate lahan",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteLand = async (id: string) => {
    try {
      const { error } = await supabase
        .from("lahan")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting land:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus lahan",
          variant: "destructive",
        });
        return false;
      }

      setLands(prev => prev.filter(l => l.id !== id));
      toast({
        title: "Berhasil",
        description: "Lahan berhasil dihapus",
      });
      return true;
    } catch (error) {
      console.error("Error deleting land:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus lahan",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchLands();
  }, [fetchLands]);

  return {
    lands,
    loading,
    addLand,
    updateLand,
    deleteLand,
    refetch: fetchLands,
  };
};