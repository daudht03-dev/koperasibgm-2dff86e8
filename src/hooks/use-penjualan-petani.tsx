import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PenjualanPetani {
  id: string;
  petani_id: string;
  pengepul_id: string;
  tanggal_jual: string;
  jumlah_kg: number;
  harga_per_kg: number;
  total_harga: number;
  warna_produk: string | null;
  kualitas: string;
  catatan: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  petani?: {
    id: string;
    nama: string;
    kode_petani: string;
  };
  pengepul?: {
    id: string;
    nama: string;
    kode_pengepul: string;
  };
}

export const usePenjualanPetani = (pengepulId?: string) => {
  const [penjualanList, setPenjualanList] = useState<PenjualanPetani[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPenjualan = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("penjualan_petani")
        .select(`
          *,
          petani:petani_id(id, nama, kode_petani),
          pengepul:pengepul_id(id, nama, kode_pengepul)
        `)
        .order("tanggal_jual", { ascending: false });

      if (pengepulId) {
        query = query.eq("pengepul_id", pengepulId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching penjualan petani:", error);
        toast({
          title: "Error",
          description: "Gagal memuat data penjualan petani",
          variant: "destructive",
        });
        return;
      }

      setPenjualanList(data || []);
    } catch (error) {
      console.error("Error fetching penjualan petani:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data penjualan petani",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addPenjualan = async (penjualan: Omit<PenjualanPetani, 'id' | 'total_harga' | 'created_at' | 'updated_at' | 'petani' | 'pengepul'>) => {
    try {
      const { data, error } = await supabase
        .from("penjualan_petani")
        .insert(penjualan)
        .select(`
          *,
          petani:petani_id(id, nama, kode_petani),
          pengepul:pengepul_id(id, nama, kode_pengepul)
        `)
        .single();

      if (error) {
        console.error("Error adding penjualan petani:", error);
        toast({
          title: "Error",
          description: "Gagal menambahkan penjualan petani",
          variant: "destructive",
        });
        return null;
      }

      if (data) {
        setPenjualanList(prev => [data, ...prev]);
        toast({
          title: "Berhasil",
          description: "Penjualan petani berhasil ditambahkan",
        });
      }
      return data;
    } catch (error) {
      console.error("Error adding penjualan petani:", error);
      toast({
        title: "Error",
        description: "Gagal menambahkan penjualan petani",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePenjualan = async (id: string, updates: Partial<PenjualanPetani>) => {
    try {
      const { data, error } = await supabase
        .from("penjualan_petani")
        .update(updates)
        .eq("id", id)
        .select(`
          *,
          petani:petani_id(id, nama, kode_petani),
          pengepul:pengepul_id(id, nama, kode_pengepul)
        `)
        .single();

      if (error) {
        console.error("Error updating penjualan petani:", error);
        toast({
          title: "Error",
          description: "Gagal mengupdate penjualan petani",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setPenjualanList(prev => prev.map(p => p.id === id ? data : p));
        toast({
          title: "Berhasil",
          description: "Penjualan petani berhasil diupdate",
        });
      }
      return true;
    } catch (error) {
      console.error("Error updating penjualan petani:", error);
      toast({
        title: "Error",
        description: "Gagal mengupdate penjualan petani",
        variant: "destructive",
      });
      return false;
    }
  };

  const deletePenjualan = async (id: string) => {
    try {
      const { error } = await supabase
        .from("penjualan_petani")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting penjualan petani:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus penjualan petani",
          variant: "destructive",
        });
        return false;
      }

      setPenjualanList(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Berhasil",
        description: "Penjualan petani berhasil dihapus",
      });
      return true;
    } catch (error) {
      console.error("Error deleting penjualan petani:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus penjualan petani",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get penjualan by date range for barang keluar calculation
  const getPenjualanByDateRange = async (startDate: string, endDate: string, pengepulId?: string) => {
    try {
      let query = supabase
        .from("penjualan_petani")
        .select(`
          *,
          petani:petani_id(id, nama, kode_petani),
          pengepul:pengepul_id(id, nama, kode_pengepul)
        `)
        .gte("tanggal_jual", startDate)
        .lte("tanggal_jual", endDate)
        .order("tanggal_jual", { ascending: true });

      if (pengepulId) {
        query = query.eq("pengepul_id", pengepulId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching penjualan by date range:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error fetching penjualan by date range:", error);
      return [];
    }
  };

  useEffect(() => {
    fetchPenjualan();
  }, [pengepulId]);

  return {
    penjualanList,
    loading,
    addPenjualan,
    updatePenjualan,
    deletePenjualan,
    getPenjualanByDateRange,
    refetch: fetchPenjualan,
  };
};
