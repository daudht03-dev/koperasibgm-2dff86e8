import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, ArrowDownToLine, ArrowUpFromLine, Warehouse, Flame, Package, ShoppingCart, Leaf, Factory, TrendingUp, Scale
} from "lucide-react";
import { usePenjualanPetani } from "@/hooks/use-penjualan-petani";
import { usePengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { usePengepul } from "@/hooks/use-pengepul";
import { useFarmers } from "@/hooks/use-farmers";
import { useBatchPanen, useProsesPengeringan, useGudangStok, usePenjualan } from "@/hooks/use-batch-panen";
import { formatRupiah } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export const RingkasanTab = () => {
  const { penjualanList } = usePenjualanPetani();
  const { pengambilanList } = usePengambilanKoperasi();
  const { pengepulList } = usePengepul();
  const { farmers } = useFarmers();
  const { batches } = useBatchPanen();
  const { proses } = useProsesPengeringan();
  const { stok } = useGudangStok();
  const { penjualan } = usePenjualan();

  // Petani stats
  const petaniStats = useMemo(() => {
    const aktif = farmers.filter(f => f.status === "aktif");
    const organik = aktif.filter(f => f.is_organic !== false);
    const konvensional = aktif.filter(f => f.is_organic === false);
    const withPengepul = aktif.filter(f => f.pengepul_id);
    return { total: aktif.length, organik: organik.length, konvensional: konvensional.length, withPengepul: withPengepul.length };
  }, [farmers]);

  // Pengepul activity
  const pengepulActivity = useMemo(() => {
    return pengepulList.filter(p => p.status === "aktif").map(p => {
      const masuk = penjualanList
        .filter(pj => pj.pengepul_id === p.id)
        .reduce((sum, pj) => sum + Number(pj.jumlah_kg), 0);
      const keluar = pengambilanList
        .filter(pk => pk.pengepul_id === p.id)
        .reduce((sum, pk) => sum + Number(pk.jumlah_kg), 0);
      const stokPengepul = masuk - keluar;
      const petaniCount = farmers.filter(f => f.pengepul_id === p.id).length;
      return {
        nama: p.nama,
        kode: p.kode_pengepul,
        masuk: Math.round(masuk),
        keluar: Math.round(keluar),
        stok: Math.round(stokPengepul),
        petani: petaniCount,
      };
    });
  }, [pengepulList, penjualanList, pengambilanList, farmers]);

  // Gudang stats
  const gudangStats = useMemo(() => {
    const totalBatch = batches.length;
    const totalPenerimaan = batches.reduce((sum, b) => sum + Number(b.jumlah_kg), 0);
    const batchProses = batches.filter(b => b.status !== "selesai").length;
    const totalPengeringan = proses.length;
    const totalKering = proses.reduce((sum, p) => sum + Number(p.total_kering_packing || 0), 0);
    const stokTersimpan = stok.filter(s => s.status === "tersimpan").reduce((sum, s) => sum + Number(s.jumlah_kg), 0);
    const totalPenjualanGudang = penjualan.reduce((sum, p) => sum + Number(p.total_harga || 0), 0);
    const totalKgTerjual = penjualan.reduce((sum, p) => sum + Number(p.jumlah_kg), 0);
    return { totalBatch, totalPenerimaan, batchProses, totalPengeringan, totalKering, stokTersimpan, totalPenjualanGudang, totalKgTerjual };
  }, [batches, proses, stok, penjualan]);

  // Batch status distribution for pie chart
  const batchStatusData = useMemo(() => {
    const statusMap: Record<string, number> = {};
    batches.forEach(b => {
      const label = b.status || "penerimaan";
      statusMap[label] = (statusMap[label] || 0) + 1;
    });
    const labels: Record<string, string> = {
      penerimaan: "Penerimaan", pengeringan: "Pengeringan", penyimpanan: "Penyimpanan",
      pengolahan: "Pengolahan", penjualan: "Penjualan", selesai: "Selesai",
    };
    return Object.entries(statusMap).map(([key, value]) => ({ name: labels[key] || key, value }));
  }, [batches]);

  // Organic vs conventional pie
  const organicData = useMemo(() => {
    const org = batches.filter(b => b.is_organic !== false).reduce((s, b) => s + Number(b.jumlah_kg), 0);
    const conv = batches.filter(b => b.is_organic === false).reduce((s, b) => s + Number(b.jumlah_kg), 0);
    return [
      { name: "Organik", value: Math.round(org) },
      { name: "Konvensional", value: Math.round(conv) },
    ].filter(d => d.value > 0);
  }, [batches]);

  // Total summary
  const totalMasukPengepul = penjualanList.reduce((s, p) => s + Number(p.jumlah_kg), 0);
  const totalKeluarPengepul = pengambilanList.reduce((s, p) => s + Number(p.jumlah_kg), 0);
  const totalNilaiMasuk = penjualanList.reduce((s, p) => s + Number(p.total_harga || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-emerald-600">Petani Aktif</p>
            </div>
            <p className="text-2xl font-bold text-emerald-800">{petaniStats.total}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                <Leaf className="h-3 w-3 mr-1" />{petaniStats.organik}
              </Badge>
              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-200">
                <Factory className="h-3 w-3 mr-1" />{petaniStats.konvensional}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownToLine className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-600">Masuk Pengepul</p>
            </div>
            <p className="text-2xl font-bold text-blue-800">{Math.round(totalMasukPengepul).toLocaleString()} Kg</p>
            <p className="text-xs text-blue-600 mt-1">{formatRupiah(totalNilaiMasuk)}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <Warehouse className="h-4 w-4 text-orange-600" />
              <p className="text-sm text-orange-600">Stok Gudang</p>
            </div>
            <p className="text-2xl font-bold text-orange-800">{Math.round(gudangStats.stokTersimpan).toLocaleString()} Kg</p>
            <p className="text-xs text-orange-600 mt-1">{gudangStats.totalBatch} batch</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-purple-600" />
              <p className="text-sm text-purple-600">Penjualan Gudang</p>
            </div>
            <p className="text-2xl font-bold text-purple-800">{formatRupiah(gudangStats.totalPenjualanGudang)}</p>
            <p className="text-xs text-purple-600 mt-1">{Math.round(gudangStats.totalKgTerjual).toLocaleString()} Kg</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pengepul Activity Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Aktivitas Pengepul
            </CardTitle>
            <CardDescription>Perbandingan barang masuk, keluar & stok per pengepul</CardDescription>
          </CardHeader>
          <CardContent>
            {pengepulActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pengepulActivity} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="kode" fontSize={12} />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} Kg`} />
                  <Legend />
                  <Bar dataKey="masuk" name="Barang Masuk" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="keluar" name="Barang Keluar" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="stok" name="Stok" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Belum ada data</div>
            )}
          </CardContent>
        </Card>

        {/* Batch Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Status Batch Gudang
            </CardTitle>
            <CardDescription>Distribusi status batch di gudang</CardDescription>
          </CardHeader>
          <CardContent>
            {batchStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={batchStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {batchStatusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Belum ada data batch</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second row charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organic vs Conventional */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="h-4 w-4" />
              Organik vs Konvensional
            </CardTitle>
            <CardDescription>Perbandingan volume (Kg) di gudang</CardDescription>
          </CardHeader>
          <CardContent>
            {organicData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={organicData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value.toLocaleString()} Kg`}>
                    <Cell fill="#22c55e" />
                    <Cell fill="#64748b" />
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toLocaleString()} Kg`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Belum ada data</div>
            )}
          </CardContent>
        </Card>

        {/* Gudang Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Warehouse className="h-4 w-4" />
              Pipeline Gudang
            </CardTitle>
            <CardDescription>Alur proses dari penerimaan hingga penjualan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "Penerimaan", value: Math.round(gudangStats.totalPenerimaan), icon: <Package className="h-4 w-4" />, color: "bg-blue-500" },
                { label: "Pengeringan", value: gudangStats.totalPengeringan, icon: <Flame className="h-4 w-4" />, color: "bg-orange-500", suffix: "proses" },
                { label: "Hasil Kering", value: Math.round(gudangStats.totalKering), icon: <Scale className="h-4 w-4" />, color: "bg-amber-500", suffix: "Kg" },
                { label: "Stok Tersimpan", value: Math.round(gudangStats.stokTersimpan), icon: <Warehouse className="h-4 w-4" />, color: "bg-purple-500", suffix: "Kg" },
                { label: "Terjual", value: Math.round(gudangStats.totalKgTerjual), icon: <ShoppingCart className="h-4 w-4" />, color: "bg-green-500", suffix: "Kg" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg text-white ${item.color}`}>{item.icon}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="font-bold">{item.value.toLocaleString()} {item.suffix || "Kg"}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${gudangStats.totalPenerimaan > 0 ? Math.min(100, (item.value / gudangStats.totalPenerimaan) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pengepul Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail Per Pengepul</CardTitle>
          <CardDescription>Ringkasan data petani, barang masuk, keluar & stok setiap pengepul</CardDescription>
        </CardHeader>
        <CardContent>
          {pengepulActivity.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Pengepul</th>
                    <th className="text-center py-2 px-3">Petani</th>
                    <th className="text-right py-2 px-3">Masuk (Kg)</th>
                    <th className="text-right py-2 px-3">Keluar (Kg)</th>
                    <th className="text-right py-2 px-3">Stok (Kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {pengepulActivity.map((p, idx) => (
                    <tr key={idx} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">
                        <div>
                          <p className="font-medium">{p.nama}</p>
                          <p className="text-xs text-muted-foreground">{p.kode}</p>
                        </div>
                      </td>
                      <td className="text-center py-2 px-3">
                        <Badge variant="outline">{p.petani}</Badge>
                      </td>
                      <td className="text-right py-2 px-3 font-medium text-blue-600">{p.masuk.toLocaleString()}</td>
                      <td className="text-right py-2 px-3 font-medium text-green-600">{p.keluar.toLocaleString()}</td>
                      <td className="text-right py-2 px-3 font-bold">{p.stok.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50 font-bold">
                    <td className="py-2 px-3">TOTAL</td>
                    <td className="text-center py-2 px-3">{petaniStats.withPengepul}</td>
                    <td className="text-right py-2 px-3 text-blue-600">{Math.round(totalMasukPengepul).toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-green-600">{Math.round(totalKeluarPengepul).toLocaleString()}</td>
                    <td className="text-right py-2 px-3">{Math.round(totalMasukPengepul - totalKeluarPengepul).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Belum ada data pengepul</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
