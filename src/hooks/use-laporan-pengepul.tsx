import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface LaporanPengepul {
  id: string;
  kode_pengepul: string;
  nama: string;
  total_masuk_kg: number;
  total_keluar_kg: number;
  selisih_kg: number;
  nilai_masuk: number;
  petani_details: PetaniDetail[];
}

export interface PetaniDetail {
  petani_id: string;
  nama: string;
  kode_petani: string;
  total_kg: number;
  total_nilai: number;
  rata_rata_per_hari: number;
}

export interface LaporanSummary {
  totalMasuk: number;
  totalKeluar: number;
  totalSelisih: number;
  totalNilai: number;
}

export const useLaporanPengepul = () => {
  const [laporanList, setLaporanList] = useState<LaporanPengepul[]>([]);
  const [summary, setSummary] = useState<LaporanSummary>({
    totalMasuk: 0,
    totalKeluar: 0,
    totalSelisih: 0,
    totalNilai: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchLaporan = async (bulan: number, tahun: number, pengepulId?: string) => {
    try {
      setLoading(true);
      
      // Calculate date range for the month
      const startDate = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
      const endDate = new Date(tahun, bulan, 0).toISOString().split('T')[0]; // Last day of month

      // Fetch all pengepul
      let pengepulQuery = supabase
        .from("pengepul")
        .select("id, kode_pengepul, nama")
        .eq("status", "aktif");
      
      if (pengepulId) {
        pengepulQuery = pengepulQuery.eq("id", pengepulId);
      }

      const { data: pengepulData, error: pengepulError } = await pengepulQuery;

      if (pengepulError) {
        console.error("Error fetching pengepul:", pengepulError);
        toast({
          title: "Error",
          description: "Gagal memuat data pengepul",
          variant: "destructive",
        });
        return;
      }

      if (!pengepulData || pengepulData.length === 0) {
        setLaporanList([]);
        setSummary({ totalMasuk: 0, totalKeluar: 0, totalSelisih: 0, totalNilai: 0 });
        return;
      }

      // Fetch barang masuk (penjualan petani) for the month
      let penjualanQuery = supabase
        .from("penjualan_petani")
        .select(`
          id,
          pengepul_id,
          petani_id,
          jumlah_kg,
          total_harga,
          tanggal_jual,
          petani:petani_id(id, nama, kode_petani)
        `)
        .gte("tanggal_jual", startDate)
        .lte("tanggal_jual", endDate);

      if (pengepulId) {
        penjualanQuery = penjualanQuery.eq("pengepul_id", pengepulId);
      }

      const { data: penjualanData, error: penjualanError } = await penjualanQuery;

      if (penjualanError) {
        console.error("Error fetching penjualan:", penjualanError);
      }

      // Fetch barang keluar (pengambilan koperasi) for the month
      let pengambilanQuery = supabase
        .from("pengambilan_koperasi")
        .select("id, pengepul_id, jumlah_kg, tanggal_ambil")
        .gte("tanggal_ambil", startDate)
        .lte("tanggal_ambil", endDate);

      if (pengepulId) {
        pengambilanQuery = pengambilanQuery.eq("pengepul_id", pengepulId);
      }

      const { data: pengambilanData, error: pengambilanError } = await pengambilanQuery;

      if (pengambilanError) {
        console.error("Error fetching pengambilan:", pengambilanError);
      }

      // Calculate days in month for average calculation
      const daysInMonth = new Date(tahun, bulan, 0).getDate();

      // Process data per pengepul
      const laporanMap: Record<string, LaporanPengepul> = {};

      pengepulData.forEach(pengepul => {
        laporanMap[pengepul.id] = {
          id: pengepul.id,
          kode_pengepul: pengepul.kode_pengepul,
          nama: pengepul.nama,
          total_masuk_kg: 0,
          total_keluar_kg: 0,
          selisih_kg: 0,
          nilai_masuk: 0,
          petani_details: [],
        };
      });

      // Group penjualan by pengepul and petani
      const petaniDataMap: Record<string, Record<string, { 
        petani_id: string;
        nama: string;
        kode_petani: string;
        total_kg: number;
        total_nilai: number;
        days_count: number;
      }>> = {};

      penjualanData?.forEach(p => {
        if (!laporanMap[p.pengepul_id]) return;

        // Update pengepul totals
        laporanMap[p.pengepul_id].total_masuk_kg += Number(p.jumlah_kg);
        laporanMap[p.pengepul_id].nilai_masuk += Number(p.total_harga || 0);

        // Track petani details
        if (!petaniDataMap[p.pengepul_id]) {
          petaniDataMap[p.pengepul_id] = {};
        }

        const petaniInfo = p.petani as { id: string; nama: string; kode_petani: string } | null;
        if (petaniInfo) {
          if (!petaniDataMap[p.pengepul_id][p.petani_id]) {
            petaniDataMap[p.pengepul_id][p.petani_id] = {
              petani_id: petaniInfo.id,
              nama: petaniInfo.nama,
              kode_petani: petaniInfo.kode_petani,
              total_kg: 0,
              total_nilai: 0,
              days_count: 0,
            };
          }
          petaniDataMap[p.pengepul_id][p.petani_id].total_kg += Number(p.jumlah_kg);
          petaniDataMap[p.pengepul_id][p.petani_id].total_nilai += Number(p.total_harga || 0);
          petaniDataMap[p.pengepul_id][p.petani_id].days_count += 1;
        }
      });

      // Add barang keluar totals
      pengambilanData?.forEach(p => {
        if (laporanMap[p.pengepul_id]) {
          laporanMap[p.pengepul_id].total_keluar_kg += Number(p.jumlah_kg);
        }
      });

      // Calculate selisih and petani details
      Object.keys(laporanMap).forEach(pengepulId => {
        laporanMap[pengepulId].selisih_kg = 
          laporanMap[pengepulId].total_masuk_kg - laporanMap[pengepulId].total_keluar_kg;

        // Add petani details
        if (petaniDataMap[pengepulId]) {
          laporanMap[pengepulId].petani_details = Object.values(petaniDataMap[pengepulId]).map(petani => ({
            petani_id: petani.petani_id,
            nama: petani.nama,
            kode_petani: petani.kode_petani,
            total_kg: petani.total_kg,
            total_nilai: petani.total_nilai,
            rata_rata_per_hari: petani.days_count > 0 ? petani.total_kg / petani.days_count : 0,
          }));
        }
      });

      const laporanResult = Object.values(laporanMap);
      setLaporanList(laporanResult);

      // Calculate summary
      const summaryData = laporanResult.reduce((acc, item) => ({
        totalMasuk: acc.totalMasuk + item.total_masuk_kg,
        totalKeluar: acc.totalKeluar + item.total_keluar_kg,
        totalSelisih: acc.totalSelisih + item.selisih_kg,
        totalNilai: acc.totalNilai + item.nilai_masuk,
      }), { totalMasuk: 0, totalKeluar: 0, totalSelisih: 0, totalNilai: 0 });

      setSummary(summaryData);
    } catch (error) {
      console.error("Error fetching laporan:", error);
      toast({
        title: "Error",
        description: "Gagal memuat laporan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    laporanList,
    summary,
    loading,
    fetchLaporan,
  };
};
