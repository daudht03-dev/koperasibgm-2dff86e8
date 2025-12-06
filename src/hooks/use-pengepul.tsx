import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Pengepul {
  id: string;
  kode_pengepul: string;
  nama: string;
  alamat: string | null;
  no_telepon: string | null;
  harga_beli: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PengepulWithPetani extends Pengepul {
  petani_count: number;
}

export const usePengepul = () => {
  const [pengepulList, setPengepulList] = useState<PengepulWithPetani[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPengepul = async () => {
    try {
      setLoading(true);
      
      // Fetch pengepul
      const { data: pengepulData, error: pengepulError } = await supabase
        .from("pengepul")
        .select("*")
        .order("created_at", { ascending: false });

      if (pengepulError) {
        console.error("Error fetching pengepul:", pengepulError);
        toast({
          title: "Error",
          description: "Gagal memuat data pengepul",
          variant: "destructive",
        });
        return;
      }

      // Fetch petani counts per pengepul
      const { data: petaniData, error: petaniError } = await supabase
        .from("petani")
        .select("pengepul_id");

      if (petaniError) {
        console.error("Error fetching petani:", petaniError);
      }

      // Count petani per pengepul
      const petaniCounts: Record<string, number> = {};
      petaniData?.forEach(p => {
        if (p.pengepul_id) {
          petaniCounts[p.pengepul_id] = (petaniCounts[p.pengepul_id] || 0) + 1;
        }
      });

      const enrichedData = (pengepulData || []).map(pengepul => ({
        ...pengepul,
        petani_count: petaniCounts[pengepul.id] || 0,
      }));

      setPengepulList(enrichedData);
    } catch (error) {
      console.error("Error fetching pengepul:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data pengepul",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateKodePengepul = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_kode_pengepul');
    if (error) {
      console.error("Error generating kode pengepul:", error);
      throw error;
    }
    return data;
  };

  const addPengepul = async (pengepul: Omit<Pengepul, 'id' | 'kode_pengepul' | 'created_at' | 'updated_at'>) => {
    try {
      const kodePengepul = await generateKodePengepul();
      
      const { data, error } = await supabase
        .from("pengepul")
        .insert({
          ...pengepul,
          kode_pengepul: kodePengepul,
        })
        .select()
        .single();

      if (error) {
        console.error("Error adding pengepul:", error);
        toast({
          title: "Error",
          description: "Gagal menambahkan pengepul",
          variant: "destructive",
        });
        return null;
      }

      if (data) {
        setPengepulList(prev => [{ ...data, petani_count: 0 }, ...prev]);
        toast({
          title: "Berhasil",
          description: `Pengepul ${kodePengepul} berhasil ditambahkan`,
        });
      }
      return data;
    } catch (error) {
      console.error("Error adding pengepul:", error);
      toast({
        title: "Error",
        description: "Gagal menambahkan pengepul",
        variant: "destructive",
      });
      return null;
    }
  };

  const updatePengepul = async (id: string, updates: Partial<Pengepul>) => {
    try {
      const { data, error } = await supabase
        .from("pengepul")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating pengepul:", error);
        toast({
          title: "Error",
          description: "Gagal mengupdate pengepul",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setPengepulList(prev => prev.map(p => 
          p.id === id ? { ...data, petani_count: p.petani_count } : p
        ));
        toast({
          title: "Berhasil",
          description: "Pengepul berhasil diupdate",
        });
      }
      return true;
    } catch (error) {
      console.error("Error updating pengepul:", error);
      toast({
        title: "Error",
        description: "Gagal mengupdate pengepul",
        variant: "destructive",
      });
      return false;
    }
  };

  const deletePengepul = async (id: string) => {
    try {
      const { error } = await supabase
        .from("pengepul")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting pengepul:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus pengepul",
          variant: "destructive",
        });
        return false;
      }

      setPengepulList(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Berhasil",
        description: "Pengepul berhasil dihapus",
      });
      return true;
    } catch (error) {
      console.error("Error deleting pengepul:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus pengepul",
        variant: "destructive",
      });
      return false;
    }
  };

  // Assign petani to pengepul
  const assignPetani = async (petaniId: string, pengepulId: string) => {
    try {
      const { error } = await supabase
        .from("petani")
        .update({ pengepul_id: pengepulId })
        .eq("id", petaniId);

      if (error) {
        console.error("Error assigning petani:", error);
        toast({
          title: "Error",
          description: "Gagal menambahkan petani ke pengepul",
          variant: "destructive",
        });
        return false;
      }

      // Update local count
      setPengepulList(prev => prev.map(p => 
        p.id === pengepulId ? { ...p, petani_count: p.petani_count + 1 } : p
      ));

      toast({
        title: "Berhasil",
        description: "Petani berhasil ditambahkan ke pengepul",
      });
      return true;
    } catch (error) {
      console.error("Error assigning petani:", error);
      return false;
    }
  };

  // Unassign petani from pengepul
  const unassignPetani = async (petaniId: string, pengepulId: string) => {
    try {
      const { error } = await supabase
        .from("petani")
        .update({ pengepul_id: null })
        .eq("id", petaniId);

      if (error) {
        console.error("Error unassigning petani:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus petani dari pengepul",
          variant: "destructive",
        });
        return false;
      }

      // Update local count
      setPengepulList(prev => prev.map(p => 
        p.id === pengepulId ? { ...p, petani_count: Math.max(0, p.petani_count - 1) } : p
      ));

      toast({
        title: "Berhasil",
        description: "Petani berhasil dihapus dari pengepul",
      });
      return true;
    } catch (error) {
      console.error("Error unassigning petani:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchPengepul();
  }, []);

  return {
    pengepulList,
    loading,
    addPengepul,
    updatePengepul,
    deletePengepul,
    assignPetani,
    unassignPetani,
    refetch: fetchPengepul,
  };
};
