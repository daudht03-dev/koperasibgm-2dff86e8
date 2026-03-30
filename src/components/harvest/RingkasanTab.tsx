import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, ArrowDownToLine, ArrowUpFromLine, Warehouse, Flame, Package, ShoppingCart, Leaf, Factory, TrendingUp, Scale, Clock, CheckCircle, Search
} from "lucide-react";
import { usePenjualanPetani } from "@/hooks/use-penjualan-petani";
import { usePengambilanKoperasi } from "@/hooks/use-pengambilan-koperasi";
import { usePengepul } from "@/hooks/use-pengepul";
import { useFarmers } from "@/hooks/use-farmers";
import { useBatchPanen, useProsesPengeringan, useGudangStok, usePenjualan } from "@/hooks/use-batch-panen";
import { formatRupiah } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export const RingkasanTab = () => {
  const navigate = useNavigate();
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

  // Pengepul activity with accurate stock
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

  // Total stok di semua pengepul
  const totalStokPengepul = useMemo(() => {
    return pengepulActivity.reduce((sum, p) => sum + p.stok, 0);
  }, [pengepulActivity]);

  // Batch stats by status
  const batchByStatus = useMemo(() => {
    const penerimaan = batches.filter(b => b.status === "penerimaan");
    const pengeringan = batches.filter(b => b.status === "pengeringan");
    const penyimpanan = batches.filter(b => b.status === "penyimpanan");
    const pengolahan = batches.filter(b => b.status === "pengolahan");
    const penjualanB = batches.filter(b => b.status === "penjualan");
    const selesai = batches.filter(b => b.status === "selesai");
    return {
      penerimaan: { count: penerimaan.length, kg: penerimaan.reduce((s, b) => s + Number(b.jumlah_kg), 0) },
      pengeringan: { count: pengeringan.length, kg: pengeringan.reduce((s, b) => s + Number(b.jumlah_kg), 0) },
      penyimpanan: { count: penyimpanan.length, kg: penyimpanan.reduce((s, b) => s + Number(b.jumlah_kg), 0) },
      pengolahan: { count: pengolahan.length, kg: pengolahan.reduce((s, b) => s + Number(b.jumlah_kg), 0) },
      penjualan: { count: penjualanB.length, kg: penjualanB.reduce((s, b) => s + Number(b.jumlah_kg), 0) },
      selesai: { count: selesai.length, kg: selesai.reduce((s, b) => s + Number(b.jumlah_kg), 0) },
    };
  }, [batches]);

  // Pengeringan active stats
  const pengeringanStats = useMemo(() => {
    const aktif = proses.filter(p => p.status === "proses");
    const selesai = proses.filter(p => p.status === "selesai");
    const totalSebelum = aktif.reduce((s, p) => s + Number(p.jumlah_kg_sebelum), 0);
    const totalKering = selesai.reduce((s, p) => s + Number(p.total_kering_packing || 0), 0);
    return { aktif: aktif.length, selesai: selesai.length, totalSedangDiproses: totalSebelum, totalKering };
  }, [proses]);

  // Gudang stats
  const gudangStats = useMemo(() => {
    const tersimpan = stok.filter(s => s.status === "tersimpan");
    const keluar = stok.filter(s => s.status === "keluar");
    const stokTersimpan = tersimpan.reduce((sum, s) => sum + Number(s.jumlah_kg), 0);
    const stokKeluar = keluar.reduce((sum, s) => sum + Number(s.jumlah_kg), 0);
    const totalPenjualanGudang = penjualan.reduce((sum, p) => sum + Number(p.total_harga || 0), 0);
    const totalKgTerjual = penjualan.reduce((sum, p) => sum + Number(p.jumlah_kg), 0);
    return { stokTersimpan, stokKeluar, totalPenjualanGudang, totalKgTerjual, totalItems: tersimpan.length };
  }, [stok, penjualan]);

  // Batch status distribution for pie chart
  const batchStatusData = useMemo(() => {
    const labels: Record<string, string> = {
      penerimaan: "Penerimaan", pengeringan: "Pengeringan", penyimpanan: "Penyimpanan",
      pengolahan: "Pengolahan", penjualan: "Penjualan", selesai: "Selesai",
    };
    return Object.entries(batchByStatus)
      .filter(([, v]) => v.count > 0)
      .map(([key, v]) => ({ name: labels[key] || key, value: v.count }));
  }, [batchByStatus]);

  // Organic vs conventional pie
  const organicData = useMemo(() => {
    const org = batches.filter(b => b.is_organic !== false).reduce((s, b) => s + Number(b.jumlah_kg), 0);
    const conv = batches.filter(b => b.is_organic === false).reduce((s, b) => s + Number(b.jumlah_kg), 0);
    return [
      { name: "Organik", value: Math.round(org) },
      { name: "Konvensional", value: Math.round(conv) },
    ].filter(d => d.value > 0);
  }, [batches]);

  const totalMasukPengepul = penjualanList.reduce((s, p) => s + Number(p.jumlah_kg), 0);
  const totalKeluarPengepul = pengambilanList.reduce((s, p) => s + Number(p.jumlah_kg), 0);
  const totalNilaiMasuk = penjualanList.reduce((s, p) => s + Number(p.total_harga || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Summary Cards - 6 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-emerald-600">Petani Aktif</p>
            </div>
            <p className="text-xl font-bold text-emerald-800">{petaniStats.total}</p>
            <div className="flex gap-1 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                <Leaf className="h-2.5 w-2.5 mr-0.5" />{petaniStats.organik}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1 bg-slate-50 text-slate-700 border-slate-200">
                <Factory className="h-2.5 w-2.5 mr-0.5" />{petaniStats.konvensional}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownToLine className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-blue-600">Stok Pengepul</p>
            </div>
            <p className="text-xl font-bold text-blue-800">{Math.round(totalStokPengepul).toLocaleString()} Kg</p>
            <p className="text-[10px] text-blue-600 mt-1">Masuk: {Math.round(totalMasukPengepul).toLocaleString()} · Keluar: {Math.round(totalKeluarPengepul).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-cyan-600" />
              <p className="text-xs text-cyan-600">Batch Penerimaan</p>
            </div>
            <p className="text-xl font-bold text-cyan-800">{batchByStatus.penerimaan.count}</p>
            <p className="text-[10px] text-cyan-600 mt-1">{Math.round(batchByStatus.penerimaan.kg).toLocaleString()} Kg menunggu proses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-600" />
              <p className="text-xs text-orange-600">Pengeringan</p>
            </div>
            <p className="text-xl font-bold text-orange-800">{pengeringanStats.aktif} <span className="text-sm font-normal">proses</span></p>
            <p className="text-[10px] text-orange-600 mt-1">{Math.round(pengeringanStats.totalSedangDiproses).toLocaleString()} Kg sedang dioven</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Warehouse className="h-4 w-4 text-purple-600" />
              <p className="text-xs text-purple-600">Stok Gudang</p>
            </div>
            <p className="text-xl font-bold text-purple-800">{Math.round(gudangStats.stokTersimpan).toLocaleString()} Kg</p>
            <p className="text-[10px] text-purple-600 mt-1">{gudangStats.totalItems} item tersimpan</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              <p className="text-xs text-green-600">Penjualan</p>
            </div>
            <p className="text-xl font-bold text-green-800">{formatRupiah(gudangStats.totalPenjualanGudang)}</p>
            <p className="text-[10px] text-green-600 mt-1">{Math.round(gudangStats.totalKgTerjual).toLocaleString()} Kg terjual</p>
          </CardContent>
        </Card>
      </div>

      {/* Supply Chain Pipeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Pipeline Supply Chain
          </CardTitle>
          <CardDescription>Alur real-time dari pengepul hingga penjualan gudang</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Stok di Pengepul", value: Math.round(totalStokPengepul), icon: <ArrowDownToLine className="h-4 w-4" />, color: "bg-blue-500", suffix: "Kg", desc: `${pengepulActivity.filter(p => p.stok > 0).length} pengepul aktif` },
              { label: "Batch Penerimaan", value: batchByStatus.penerimaan.count, icon: <Package className="h-4 w-4" />, color: "bg-cyan-500", suffix: "batch", desc: `${Math.round(batchByStatus.penerimaan.kg).toLocaleString()} Kg` },
              { label: "Sedang Dikeringkan", value: pengeringanStats.aktif, icon: <Flame className="h-4 w-4" />, color: "bg-orange-500", suffix: "proses", desc: `${Math.round(pengeringanStats.totalSedangDiproses).toLocaleString()} Kg` },
              { label: "Hasil Kering", value: Math.round(pengeringanStats.totalKering), icon: <Scale className="h-4 w-4" />, color: "bg-amber-500", suffix: "Kg", desc: `${pengeringanStats.selesai} proses selesai` },
              { label: "Stok Gudang", value: Math.round(gudangStats.stokTersimpan), icon: <Warehouse className="h-4 w-4" />, color: "bg-purple-500", suffix: "Kg", desc: `${gudangStats.totalItems} item` },
              { label: "Terjual", value: Math.round(gudangStats.totalKgTerjual), icon: <ShoppingCart className="h-4 w-4" />, color: "bg-green-500", suffix: "Kg", desc: formatRupiah(gudangStats.totalPenjualanGudang) },
            ].map((item, idx) => {
              const maxVal = Math.max(totalStokPengepul, batchByStatus.penerimaan.kg, pengeringanStats.totalSedangDiproses, gudangStats.stokTersimpan, gudangStats.totalKgTerjual, 1);
              const pct = Math.min(100, (item.value / maxVal) * 100);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg text-white ${item.color} shrink-0`}>{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="font-bold">{item.value.toLocaleString()} {item.suffix}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                    <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                      <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pengepul Activity Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Stok Per Pengepul
            </CardTitle>
            <CardDescription>Masuk, keluar & sisa stok di setiap pengepul</CardDescription>
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
                  <Bar dataKey="stok" name="Stok di Pengepul" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
            <CardDescription>Distribusi status batch saat ini</CardDescription>
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

      {/* Organic + Batch detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

        {/* Batch yang sedang dikeringkan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Batch Dalam Pengeringan
            </CardTitle>
            <CardDescription>Detail proses pengeringan yang sedang berjalan</CardDescription>
          </CardHeader>
          <CardContent>
            {proses.filter(p => p.status === "proses").length > 0 ? (
              <div className="space-y-3 max-h-[250px] overflow-y-auto">
                {proses.filter(p => p.status === "proses").map((p) => {
                  const batch = batches.find(b => b.id === p.batch_id);
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border bg-orange-50/50">
                      <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{batch?.batch_number || p.lot_number || "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {Number(p.jumlah_kg_sebelum).toLocaleString()} Kg · {p.suhu_oven ? `${p.suhu_oven}°C` : "—"} · {p.operator || "—"}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-xs shrink-0">
                        Proses
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Tidak ada proses pengeringan aktif</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pengepul Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail Stok Per Pengepul</CardTitle>
          <CardDescription>Ringkasan data petani, barang masuk, keluar & stok di setiap pengepul</CardDescription>
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
                    <td className="text-right py-2 px-3">{Math.round(totalStokPengepul).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Belum ada data pengepul</div>
          )}
        </CardContent>
      </Card>

      {/* Traceability Link */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Traceability Produk</h3>
              <p className="text-sm text-muted-foreground">Lacak kode produk dari estimasi hingga gudang secara end-to-end</p>
            </div>
          </div>
          <Button onClick={() => navigate("/admin/traceability")} className="shrink-0">
            <Search className="h-4 w-4 mr-2" /> Buka Traceability
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
