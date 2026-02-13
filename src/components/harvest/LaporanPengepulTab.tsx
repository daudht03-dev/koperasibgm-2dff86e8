import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileBarChart, RefreshCw, ChevronDown, ChevronRight, Download } from "lucide-react";
import { useLaporanPengepul } from "@/hooks/use-laporan-pengepul";
import { usePengepul } from "@/hooks/use-pengepul";
import { TableSkeleton } from "@/components/ui/skeleton-templates";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const months = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export const LaporanPengepulTab = () => {
  const { laporanList, summary, loading, fetchLaporan } = useLaporanPengepul();
  const { pengepulList } = usePengepul();
  
  const [bulan, setBulan] = useState(String(new Date().getMonth() + 1));
  const [tahun, setTahun] = useState(String(currentYear));
  const [filterPengepul, setFilterPengepul] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLaporan(parseInt(bulan), parseInt(tahun), filterPengepul === "all" ? undefined : filterPengepul);
  }, [bulan, tahun, filterPengepul]);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleRefresh = () => {
    fetchLaporan(parseInt(bulan), parseInt(tahun), filterPengepul === "all" ? undefined : filterPengepul);
  };

  // Prepare chart data
  const chartData = laporanList.map(item => ({
    name: item.nama,
    masuk: item.total_masuk_kg,
    keluar: item.total_keluar_kg,
  }));

  const handleExportCSV = () => {
    const headers = ["Pengepul", "Kode", "Total Masuk (Kg)", "Total Keluar (Kg)", "Stok (Kg)", "Nilai Masuk (Rp)"];
    const rows = laporanList.map(item => [
      item.nama,
      item.kode_pengepul,
      item.total_masuk_kg,
      item.total_keluar_kg,
      item.selisih_kg,
      item.nilai_masuk,
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-pengepul-${bulan}-${tahun}.csv`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              Laporan Bulanan Pengepul
            </CardTitle>
            <CardDescription>Ringkasan barang masuk dan keluar per pengepul</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={bulan} onValueChange={setBulan}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tahun} onValueChange={setTahun}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPengepul} onValueChange={setFilterPengepul}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Semua Pengepul" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Pengepul</SelectItem>
                {pengepulList.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-4">
              <p className="text-sm text-blue-600">Total Barang Masuk</p>
              <p className="text-2xl font-bold text-blue-800">{summary.totalMasuk.toLocaleString()} Kg</p>
              <p className="text-xs text-blue-500 mt-1">Dari petani ke pengepul</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-4">
              <p className="text-sm text-green-600">Total Barang Keluar</p>
              <p className="text-2xl font-bold text-green-800">{summary.totalKeluar.toLocaleString()} Kg</p>
              <p className="text-xs text-green-500 mt-1">Dari pengepul ke koperasi</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="pt-4">
              <p className="text-sm text-orange-600">Stok di Pengepul</p>
              <p className="text-2xl font-bold text-orange-800">{summary.totalSelisih.toLocaleString()} Kg</p>
              <p className="text-xs text-orange-500 mt-1">Masuk - Keluar</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-4">
              <p className="text-sm text-purple-600">Total Nilai Masuk</p>
              <p className="text-2xl font-bold text-purple-800">Rp {summary.totalNilai.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grafik Perbandingan</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="masuk" name="Barang Masuk (Kg)" fill="#3b82f6" />
                  <Bar dataKey="keluar" name="Barang Keluar (Kg)" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Data Table */}
        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : laporanList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileBarChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Tidak ada data untuk periode ini</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Pengepul</TableHead>
                <TableHead className="text-right">Masuk (Kg)</TableHead>
                <TableHead className="text-right">Keluar (Kg)</TableHead>
                <TableHead className="text-right">Stok (Kg)</TableHead>
                <TableHead className="text-right">Nilai Masuk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laporanList.map((item) => (
                <>
                  <TableRow 
                    key={item.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleRow(item.id)}
                  >
                    <TableCell>
                      {expandedRows.has(item.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.nama}</p>
                        <p className="text-xs text-muted-foreground">{item.kode_pengepul}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.total_masuk_kg.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">{item.total_keluar_kg.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">{item.selisih_kg.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium">Rp {item.nilai_masuk.toLocaleString()}</TableCell>
                  </TableRow>
                  {expandedRows.has(item.id) && item.petani_details.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/30 p-0">
                        <div className="p-4">
                          <h4 className="font-medium mb-2 text-sm">Detail Petani</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Nama Petani</TableHead>
                                <TableHead>Kode</TableHead>
                                <TableHead className="text-right">Total Jual (Kg)</TableHead>
                                <TableHead className="text-right">Total Nilai</TableHead>
                                <TableHead className="text-right">Rata-rata/Hari</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {item.petani_details.map((petani) => (
                                <TableRow key={petani.petani_id}>
                                  <TableCell>{petani.nama}</TableCell>
                                  <TableCell className="font-mono">{petani.kode_petani}</TableCell>
                                  <TableCell className="text-right">{petani.total_kg.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">Rp {petani.total_nilai.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{petani.rata_rata_per_hari.toFixed(1)} Kg</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {/* Total Row */}
              <TableRow className="font-bold bg-muted/50">
                <TableCell></TableCell>
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{summary.totalMasuk.toLocaleString()}</TableCell>
                <TableCell className="text-right">{summary.totalKeluar.toLocaleString()}</TableCell>
                <TableCell className="text-right">{summary.totalSelisih.toLocaleString()}</TableCell>
                <TableCell className="text-right">Rp {summary.totalNilai.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
