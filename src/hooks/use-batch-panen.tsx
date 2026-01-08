import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Types based on database schema
export type BatchStatus = 'penerimaan' | 'pengeringan' | 'penyimpanan' | 'pengolahan' | 'penjualan' | 'selesai';
export type QualityGrade = 'premium' | 'grade_a' | 'grade_b' | 'grade_c';

export interface BatchPanen {
  id: string;
  batch_number: string;
  petani_id: string;
  lahan_id: string | null;
  tanggal_penerimaan: string;
  jumlah_kg: number;
  warna_produk: string | null;
  kualitas: QualityGrade;
  harga_per_kg: number | null;
  total_harga: number | null;
  kondisi: string | null;
  status: BatchStatus;
  pengepul_ids: string[] | null;
  is_organic: boolean;
  detail_petani?: unknown; // JSON from database - optional
  created_at: string;
  updated_at: string;
  // Joined data
  petani?: {
    id: string;
    nama: string;
    kode_petani: string;
    alamat: string | null;
  };
  lahan?: {
    id: string;
    nama_lahan: string;
    lokasi: string | null;
  };
}

export interface PetaniDetailPengeringan {
  petani_id: string;
  petani_nama: string;
  petani_kode: string;
  jumlah_kg: number;
  is_organic: boolean;
}

export interface ProsesPengeringan {
  id: string;
  batch_id: string;
  lot_number: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string | null;
  suhu_oven: number | null;
  durasi_jam: number | null;
  kadar_air_awal: number | null;
  kadar_air_akhir: number | null;
  jumlah_kg_sebelum: number;
  jumlah_kg_sesudah: number | null;
  penyusutan_kg: number | null;
  susut_persen: number | null;
  qc_off: number | null;
  susut_qc_off_persen: number | null;
  total_kering: number | null;
  total_kering_packing: number | null;
  is_organic: boolean;
  detail_petani: unknown; // JSON from database
  operator: string | null;
  catatan: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface GudangStok {
  id: string;
  batch_id: string;
  lokasi_gudang: string;
  rak_posisi: string | null;
  tanggal_masuk: string;
  tanggal_keluar: string | null;
  jumlah_kg: number;
  kondisi_penyimpanan: string | null;
  suhu_gudang: number | null;
  kelembaban: number | null;
  tipe_stok: string;
  is_organic: boolean;
  catatan: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PengolahanDokumen {
  id: string;
  batch_id: string;
  nomor_dokumen: string;
  jenis_dokumen: string;
  tanggal_dokumen: string;
  penerbit: string | null;
  masa_berlaku: string | null;
  file_url: string | null;
  catatan: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Penjualan {
  id: string;
  batch_id: string;
  nomor_invoice: string;
  tanggal_penjualan: string;
  pembeli: string;
  alamat_pembeli: string | null;
  jumlah_kg: number;
  harga_per_kg: number;
  total_harga: number | null;
  metode_pembayaran: string | null;
  status_pembayaran: string;
  tanggal_kirim: string | null;
  catatan: string | null;
  created_at: string;
  updated_at: string;
}

export const useBatchPanen = () => {
  const [batches, setBatches] = useState<BatchPanen[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("batch_panen")
        .select(`
          *,
          petani:petani_id(id, nama, kode_petani, alamat),
          lahan:lahan_id(id, nama_lahan, lokasi)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching batches:", error);
        toast({
          title: "Error",
          description: "Gagal memuat data batch panen",
          variant: "destructive",
        });
        return;
      }

      setBatches(data || []);
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data batch panen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBatchNumber = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_batch_number');
    if (error) {
      console.error("Error generating batch number:", error);
      throw error;
    }
    return data;
  };

  const addBatch = async (batch: Omit<BatchPanen, 'id' | 'batch_number' | 'total_harga' | 'created_at' | 'updated_at' | 'petani' | 'lahan' | 'detail_petani'> & { detail_petani?: unknown }) => {
    try {
      const batchNumber = await generateBatchNumber();
      
      const { data, error } = await supabase
        .from("batch_panen")
        .insert({
          ...batch,
          batch_number: batchNumber,
          detail_petani: batch.detail_petani || null,
        } as any)
        .select(`
          *,
          petani:petani_id(id, nama, kode_petani, alamat),
          lahan:lahan_id(id, nama_lahan, lokasi)
        `)
        .single();

      if (error) {
        console.error("Error adding batch:", error);
        toast({
          title: "Error",
          description: "Gagal menambahkan batch panen",
          variant: "destructive",
        });
        return null;
      }

      if (data) {
        setBatches(prev => [data, ...prev]);
        toast({
          title: "Berhasil",
          description: `Batch ${batchNumber} berhasil ditambahkan`,
        });
      }
      return data;
    } catch (error) {
      console.error("Error adding batch:", error);
      toast({
        title: "Error",
        description: "Gagal menambahkan batch panen",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateBatch = async (id: string, updates: Partial<BatchPanen>) => {
    try {
      const { data, error } = await supabase
        .from("batch_panen")
        .update(updates as any)
        .eq("id", id)
        .select(`
          *,
          petani:petani_id(id, nama, kode_petani, alamat),
          lahan:lahan_id(id, nama_lahan, lokasi)
        `)
        .single();

      if (error) {
        console.error("Error updating batch:", error);
        toast({
          title: "Error",
          description: "Gagal mengupdate batch panen",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setBatches(prev => prev.map(b => b.id === id ? data : b));
        toast({
          title: "Berhasil",
          description: "Batch panen berhasil diupdate",
        });
      }
      return true;
    } catch (error) {
      console.error("Error updating batch:", error);
      toast({
        title: "Error",
        description: "Gagal mengupdate batch panen",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteBatch = async (id: string) => {
    try {
      const { error } = await supabase
        .from("batch_panen")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting batch:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus batch panen",
          variant: "destructive",
        });
        return false;
      }

      setBatches(prev => prev.filter(b => b.id !== id));
      toast({
        title: "Berhasil",
        description: "Batch panen berhasil dihapus",
      });
      return true;
    } catch (error) {
      console.error("Error deleting batch:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus batch panen",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateBatchStatus = async (id: string, status: BatchStatus) => {
    return updateBatch(id, { status });
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  return {
    batches,
    loading,
    addBatch,
    updateBatch,
    deleteBatch,
    updateBatchStatus,
    refetch: fetchBatches,
  };
};

// Hook for Proses Pengeringan
export const useProsesPengeringan = (batchId?: string) => {
  const [proses, setProses] = useState<ProsesPengeringan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProses = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("proses_pengeringan")
        .select("*")
        .order("tanggal_mulai", { ascending: false });

      if (batchId) {
        query = query.eq("batch_id", batchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching proses pengeringan:", error);
        return;
      }

      setProses((data || []) as ProsesPengeringan[]);
    } catch (error) {
      console.error("Error fetching proses pengeringan:", error);
    } finally {
      setLoading(false);
    }
  };

  const addProses = async (data: Omit<ProsesPengeringan, 'id' | 'penyusutan_kg' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: newData, error } = await supabase
        .from("proses_pengeringan")
        .insert(data as any)
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Gagal menambahkan proses pengeringan",
          variant: "destructive",
        });
        return null;
      }

      if (newData) {
        setProses(prev => [newData as ProsesPengeringan, ...prev]);
        toast({
          title: "Berhasil",
          description: "Proses pengeringan berhasil ditambahkan",
        });
      }
      return newData as ProsesPengeringan;
    } catch (error) {
      console.error("Error adding proses:", error);
      return null;
    }
  };

  const updateProses = async (id: string, updates: Partial<ProsesPengeringan>) => {
    try {
      const { data, error } = await supabase
        .from("proses_pengeringan")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Gagal mengupdate proses pengeringan",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setProses(prev => prev.map(p => p.id === id ? data as ProsesPengeringan : p));
        toast({
          title: "Berhasil",
          description: "Proses pengeringan berhasil diupdate",
        });
      }
      return true;
    } catch (error) {
      console.error("Error updating proses:", error);
      return false;
    }
  };

  const deleteProses = async (id: string, batchId?: string) => {
    try {
      const { error } = await supabase
        .from("proses_pengeringan")
        .delete()
        .eq("id", id);

      if (error) {
        toast({
          title: "Error",
          description: "Gagal menghapus proses pengeringan",
          variant: "destructive",
        });
        return false;
      }

      // Also delete associated batch if provided
      if (batchId) {
        await supabase.from("batch_panen").delete().eq("id", batchId);
      }

      setProses(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Berhasil",
        description: "Proses pengeringan berhasil dihapus",
      });
      return true;
    } catch (error) {
      console.error("Error deleting proses:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchProses();
  }, [batchId]);

  return {
    proses,
    loading,
    addProses,
    updateProses,
    deleteProses,
    refetch: fetchProses,
  };
};

// Hook for Gudang Stok
export const useGudangStok = (batchId?: string) => {
  const [stok, setStok] = useState<GudangStok[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStok = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("gudang_stok")
        .select("*")
        .order("tanggal_masuk", { ascending: false });

      if (batchId) {
        query = query.eq("batch_id", batchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching gudang stok:", error);
        return;
      }

      setStok(data || []);
    } catch (error) {
      console.error("Error fetching gudang stok:", error);
    } finally {
      setLoading(false);
    }
  };

  const addStok = async (data: Omit<GudangStok, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: newData, error } = await supabase
        .from("gudang_stok")
        .insert(data)
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Gagal menambahkan stok gudang",
          variant: "destructive",
        });
        return null;
      }

      if (newData) {
        setStok(prev => [newData, ...prev]);
        toast({
          title: "Berhasil",
          description: "Stok gudang berhasil ditambahkan",
        });
      }
      return newData;
    } catch (error) {
      console.error("Error adding stok:", error);
      return null;
    }
  };

  const updateStok = async (id: string, updates: Partial<GudangStok>) => {
    try {
      const { data, error } = await supabase
        .from("gudang_stok")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Gagal mengupdate stok gudang",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setStok(prev => prev.map(s => s.id === id ? data : s));
        toast({
          title: "Berhasil",
          description: "Stok gudang berhasil diupdate",
        });
      }
      return true;
    } catch (error) {
      console.error("Error updating stok:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchStok();
  }, [batchId]);

  return {
    stok,
    loading,
    addStok,
    updateStok,
    refetch: fetchStok,
  };
};

// Hook for Pengolahan Dokumen
export const usePengolahanDokumen = (batchId?: string) => {
  const [dokumen, setDokumen] = useState<PengolahanDokumen[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDokumen = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("pengolahan_dokumen")
        .select("*")
        .order("tanggal_dokumen", { ascending: false });

      if (batchId) {
        query = query.eq("batch_id", batchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching dokumen:", error);
        return;
      }

      setDokumen(data || []);
    } catch (error) {
      console.error("Error fetching dokumen:", error);
    } finally {
      setLoading(false);
    }
  };

  const addDokumen = async (data: Omit<PengolahanDokumen, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: newData, error } = await supabase
        .from("pengolahan_dokumen")
        .insert(data)
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Gagal menambahkan dokumen",
          variant: "destructive",
        });
        return null;
      }

      if (newData) {
        setDokumen(prev => [newData, ...prev]);
        toast({
          title: "Berhasil",
          description: "Dokumen berhasil ditambahkan",
        });
      }
      return newData;
    } catch (error) {
      console.error("Error adding dokumen:", error);
      return null;
    }
  };

  useEffect(() => {
    fetchDokumen();
  }, [batchId]);

  return {
    dokumen,
    loading,
    addDokumen,
    refetch: fetchDokumen,
  };
};

// Hook for Penjualan
export const usePenjualan = (batchId?: string) => {
  const [penjualan, setPenjualan] = useState<Penjualan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPenjualan = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("penjualan")
        .select("*")
        .order("tanggal_penjualan", { ascending: false });

      if (batchId) {
        query = query.eq("batch_id", batchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching penjualan:", error);
        return;
      }

      setPenjualan(data || []);
    } catch (error) {
      console.error("Error fetching penjualan:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_invoice_number');
    if (error) {
      console.error("Error generating invoice number:", error);
      throw error;
    }
    return data;
  };

  const addPenjualan = async (data: Omit<Penjualan, 'id' | 'nomor_invoice' | 'total_harga' | 'created_at' | 'updated_at'>) => {
    try {
      const invoiceNumber = await generateInvoiceNumber();
      
      const { data: newData, error } = await supabase
        .from("penjualan")
        .insert({
          ...data,
          nomor_invoice: invoiceNumber,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Gagal menambahkan penjualan",
          variant: "destructive",
        });
        return null;
      }

      if (newData) {
        setPenjualan(prev => [newData, ...prev]);
        toast({
          title: "Berhasil",
          description: `Penjualan ${invoiceNumber} berhasil ditambahkan`,
        });
      }
      return newData;
    } catch (error) {
      console.error("Error adding penjualan:", error);
      return null;
    }
  };

  const updatePenjualan = async (id: string, updates: Partial<Penjualan>) => {
    try {
      const { data, error } = await supabase
        .from("penjualan")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Gagal mengupdate penjualan",
          variant: "destructive",
        });
        return false;
      }

      if (data) {
        setPenjualan(prev => prev.map(p => p.id === id ? data : p));
        toast({
          title: "Berhasil",
          description: "Penjualan berhasil diupdate",
        });
      }
      return true;
    } catch (error) {
      console.error("Error updating penjualan:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchPenjualan();
  }, [batchId]);

  return {
    penjualan,
    loading,
    addPenjualan,
    updatePenjualan,
    refetch: fetchPenjualan,
  };
};
