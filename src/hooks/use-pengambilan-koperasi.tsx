import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PengambilanKoperasi {
  id: string;
  pengepul_id: string;
  tanggal_ambil: string;
  jumlah_kg: number;
  batch_id: string | null;
  catatan: string | null;
  lot_number: string | null;
  is_organic: boolean;
  detail_petani: unknown; // JSON from database
  created_at: string;
  updated_at: string;
  // Joined data
  pengepul?: {
    id: string;
    nama: string;
    kode_pengepul: string;
  };
}

export const usePengambilanKoperasi = (pengepulId?: string) => {
  const [pengambilanList, setPengambilanList] = useState<PengambilanKoperasi[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPengambilan = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("pengambilan_koperasi")
        .select(`
          *,
          pengepul:pengepul_id(id, nama, kode_pengepul)
        `)
        .order("tanggal_ambil", { ascending: false });

      if (pengepulId) {
        query = query.eq("pengepul_id", pengepulId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching pengambilan koperasi:", error);
        toast({
          title: "Error",
          description: "Gagal memuat data pengambilan",
          variant: "destructive",
        });
        return;
      }

      setPengambilanList(data || []);
    } catch (error) {
      console.error("Error fetching pengambilan koperasi:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data pengambilan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPengambilan = async (pengambilan: Omit<PengambilanKoperasi, 'id' | 'created_at' | 'updated_at' | 'pengepul'>) => {
    try {
      const { data, error } = await supabase
        .from("pengambilan_koperasi")
        .insert(pengambilan as any)
        .select(`
          *,
          pengepul:pengepul_id(id, nama, kode_pengepul)
        `)
        .single();

      if (error) {
        console.error("Error adding pengambilan:", error);
        toast({
          title: "Error",
          description: "Gagal menambahkan pengambilan",
          variant: "destructive",
        });
        return null;
      }

      if (data) {
        setPengambilanList(prev => [data as PengambilanKoperasi, ...prev]);
        toast({
          title: "Berhasil",
          description: "Pengambilan berhasil ditambahkan",
        });
      }
      return data as PengambilanKoperasi;
    } catch (error) {
      console.error("Error adding pengambilan:", error);
      toast({
        title: "Error",
        description: "Gagal menambahkan pengambilan",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePengambilan = async (id: string, updates: Partial<PengambilanKoperasi>) => {
    try {
      const { data, error } = await supabase
        .from("pengambilan_koperasi")
        .update(updates as any)
        .eq("id", id)
        .select(`
          *,
          pengepul:pengepul_id(id, nama, kode_pengepul)
        `)
        .single();

      if (error) {
        console.error("Error updating pengambilan:", error);
        toast({
          title: "Error",
          description: "Gagal mengupdate pengambilan",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setPengambilanList(prev => prev.map(p => p.id === id ? data : p));
        toast({
          title: "Berhasil",
          description: "Pengambilan berhasil diupdate",
        });
      }
      return true;
    } catch (error) {
      console.error("Error updating pengambilan:", error);
      toast({
        title: "Error",
        description: "Gagal mengupdate pengambilan",
        variant: "destructive",
      });
      return false;
    }
  };

  const deletePengambilan = async (id: string) => {
    try {
      const { error } = await supabase
        .from("pengambilan_koperasi")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting pengambilan:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus pengambilan",
          variant: "destructive",
        });
        return false;
      }

      setPengambilanList(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Berhasil",
        description: "Pengambilan berhasil dihapus",
      });
      return true;
    } catch (error) {
      console.error("Error deleting pengambilan:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus pengambilan",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get pengambilan by date for batch creation
  const getPengambilanByDate = async (date: string) => {
    try {
      const { data, error } = await supabase
        .from("pengambilan_koperasi")
        .select(`
          *,
          pengepul:pengepul_id(id, nama, kode_pengepul)
        `)
        .eq("tanggal_ambil", date)
        .is("batch_id", null);

      if (error) {
        console.error("Error fetching pengambilan by date:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching pengambilan by date:", error);
      return [];
    }
  };

  useEffect(() => {
    fetchPengambilan();
  }, [pengepulId]);

  return {
    pengambilanList,
    loading,
    addPengambilan,
    updatePengambilan,
    deletePengambilan,
    getPengambilanByDate,
    refetch: fetchPengambilan,
  };
};
