import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/ui/navbar";
import Footer from "@/components/ui/footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Package, Flame, Warehouse, FileText, ShoppingCart, CheckCircle2, Circle, Clock, User, MapPin, Calendar, Scale, Droplets, Thermometer, DollarSign, Edit } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { BatchPanen, BatchStatus, ProsesPengeringan, GudangStok, PengolahanDokumen, Penjualan, QualityGrade } from "@/hooks/use-batch-panen";

const statusSteps: { key: BatchStatus; label: string; icon: React.ElementType }[] = [
  { key: "penerimaan", label: "Penerimaan", icon: Package },
  { key: "pengeringan", label: "Pengeringan", icon: Flame },
  { key: "penyimpanan", label: "Penyimpanan", icon: Warehouse },
  { key: "pengolahan", label: "Dokumen", icon: FileText },
  { key: "penjualan", label: "Penjualan", icon: ShoppingCart },
  { key: "selesai", label: "Selesai", icon: CheckCircle2 },
];

const qualityLabels: Record<QualityGrade, string> = {
  premium: "Premium",
  grade_a: "Grade A",
  grade_b: "Grade B",
  grade_c: "Grade C",
};

const BatchDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<BatchPanen | null>(null);
  const [pengeringan, setPengeringan] = useState<ProsesPengeringan[]>([]);
  const [gudang, setGudang] = useState<GudangStok[]>([]);
  const [dokumen, setDokumen] = useState<PengolahanDokumen[]>([]);
  const [penjualan, setPenjualan] = useState<Penjualan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialog states for completing processes
  const [pengeringanDialogOpen, setPengeringanDialogOpen] = useState(false);
  const [selectedPengeringan, setSelectedPengeringan] = useState<ProsesPengeringan | null>(null);
  const [pengeringanComplete, setPengeringanComplete] = useState({
    kadar_air_akhir: "",
    jumlah_kg_sesudah: "",
  });

  useEffect(() => {
    if (id) {
      fetchBatchData();
    }
  }, [id]);

  const fetchBatchData = async () => {
    try {
      setLoading(true);
      
      // Fetch batch data
      const { data: batchData, error: batchError } = await supabase
        .from("batch_panen")
        .select(`
          *,
          petani:petani_id(id, nama, kode_petani, alamat),
          lahan:lahan_id(id, nama_lahan, lokasi)
        `)
        .eq("id", id)
        .single();

      if (batchError) throw batchError;
      setBatch(batchData);

      // Fetch related data in parallel
      const [pengeringanRes, gudangRes, dokumenRes, penjualanRes] = await Promise.all([
        supabase.from("proses_pengeringan").select("*").eq("batch_id", id).order("tanggal_mulai", { ascending: false }),
        supabase.from("gudang_stok").select("*").eq("batch_id", id).order("tanggal_masuk", { ascending: false }),
        supabase.from("pengolahan_dokumen").select("*").eq("batch_id", id).order("tanggal_dokumen", { ascending: false }),
        supabase.from("penjualan").select("*").eq("batch_id", id).order("tanggal_penjualan", { ascending: false }),
      ]);

      setPengeringan(pengeringanRes.data || []);
      setGudang(gudangRes.data || []);
      setDokumen(dokumenRes.data || []);
      setPenjualan(penjualanRes.data || []);

    } catch (error) {
      console.error("Error fetching batch data:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data batch",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!batch) return 0;
    return statusSteps.findIndex(step => step.key === batch.status);
  };

  const handleCompletePengeringan = async () => {
    if (!selectedPengeringan || !id) return;

    try {
      const { error } = await supabase
        .from("proses_pengeringan")
        .update({
          tanggal_selesai: new Date().toISOString(),
          kadar_air_akhir: pengeringanComplete.kadar_air_akhir ? parseFloat(pengeringanComplete.kadar_air_akhir) : null,
          jumlah_kg_sesudah: pengeringanComplete.jumlah_kg_sesudah ? parseFloat(pengeringanComplete.jumlah_kg_sesudah) : null,
          status: "selesai",
        })
        .eq("id", selectedPengeringan.id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: "Proses pengeringan selesai",
      });

      setPengeringanDialogOpen(false);
      setPengeringanComplete({ kadar_air_akhir: "", jumlah_kg_sesudah: "" });
      fetchBatchData();
    } catch (error) {
      console.error("Error completing pengeringan:", error);
      toast({
        title: "Error",
        description: "Gagal menyelesaikan proses",
        variant: "destructive",
      });
    }
  };

  const updateBatchStatus = async (status: BatchStatus) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("batch_panen")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Berhasil",
        description: `Status batch diubah ke ${status}`,
      });

      fetchBatchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Gagal mengubah status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Memuat data...</div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-gradient-natural flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Batch tidak ditemukan</p>
          <Button asChild>
            <Link to="/admin/harvest-management">Kembali</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="min-h-screen bg-gradient-natural">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/admin/harvest-management">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Manajemen Panen
            </Link>
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 font-mono">
                {batch.batch_number}
              </h1>
              <p className="text-muted-foreground">
                Detail dan tracking batch panen
              </p>
            </div>
            <div className="flex gap-2">
              {batch.status !== 'selesai' && (
                <Button 
                  onClick={() => updateBatchStatus('selesai')}
                  className="bg-gradient-organic"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Tandai Selesai
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Timeline Progress */}
        <Card className="mb-8 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-organic-green/10 to-organic-gold/10">
            <CardTitle>Progress Timeline</CardTitle>
            <CardDescription>Tracking status batch dari penerimaan hingga selesai</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute top-6 left-0 right-0 h-1 bg-muted">
                <div 
                  className="h-full bg-gradient-organic transition-all duration-500"
                  style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
                />
              </div>
              
              {/* Steps */}
              <div className="relative flex justify-between">
                {statusSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  
                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div 
                        className={`
                          w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-300
                          ${isCompleted 
                            ? 'bg-gradient-organic text-primary-foreground shadow-lg' 
                            : 'bg-muted text-muted-foreground'
                          }
                          ${isCurrent ? 'ring-4 ring-organic-green/30 scale-110' : ''}
                        `}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`mt-2 text-xs font-medium text-center ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Batch Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Informasi Batch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Petani</p>
                  <p className="font-medium">{batch.petani?.nama}</p>
                  <p className="text-xs text-muted-foreground">{batch.petani?.kode_petani}</p>
                </div>
              </div>
              
              {batch.lahan && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Lahan</p>
                    <p className="font-medium">{batch.lahan.nama_lahan}</p>
                    {batch.lahan.lokasi && (
                      <p className="text-xs text-muted-foreground">{batch.lahan.lokasi}</p>
                    )}
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Penerimaan</p>
                  <p className="font-medium">
                    {format(new Date(batch.tanggal_penerimaan), "dd MMMM yyyy", { locale: localeId })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Scale className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah</p>
                  <p className="font-medium">{Number(batch.jumlah_kg).toLocaleString()} Kg</p>
                </div>
              </div>
              
{batch.warna_produk && (
                <div className="flex items-center gap-3">
                  <Droplets className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Warna Produk</p>
                    <p className="font-medium">{batch.warna_produk}</p>
                  </div>
                </div>
              )}
              
              <Separator />
              
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{qualityLabels[batch.kualitas]}</Badge>
              </div>
              
              {batch.harga_per_kg && (
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Harga Beli</p>
                    <p className="font-medium">Rp {Number(batch.harga_per_kg).toLocaleString()}/Kg</p>
                    <p className="text-sm text-organic-green font-semibold">
                      Total: Rp {Number(batch.total_harga || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Riwayat Aktivitas
              </CardTitle>
              <CardDescription>Timeline proses dari penerimaan hingga penjualan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Penerimaan */}
                <div className="relative pl-8 pb-6 border-l-2 border-organic-green">
                  <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-gradient-organic flex items-center justify-center">
                    <Package className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <div className="bg-organic-green/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">Penerimaan</h4>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(batch.created_at), "dd MMM yyyy HH:mm", { locale: localeId })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Diterima {Number(batch.jumlah_kg).toLocaleString()} Kg dari {batch.petani?.nama}
                    </p>
                  </div>
                </div>

                {/* Pengeringan */}
                {pengeringan.map((p, index) => (
                  <div key={p.id} className={`relative pl-8 pb-6 border-l-2 ${p.status === 'selesai' ? 'border-organic-green' : 'border-orange-400'}`}>
                    <div className={`absolute -left-3 top-0 w-6 h-6 rounded-full flex items-center justify-center ${p.status === 'selesai' ? 'bg-gradient-organic' : 'bg-orange-400'}`}>
                      <Flame className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className={`rounded-lg p-4 ${p.status === 'selesai' ? 'bg-organic-green/5' : 'bg-orange-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">
                          Pengeringan {p.status !== 'selesai' && <Badge variant="secondary" className="ml-2">Proses</Badge>}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(p.tanggal_mulai), "dd MMM yyyy HH:mm", { locale: localeId })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {p.suhu_oven && <p><Thermometer className="h-3 w-3 inline mr-1" />Suhu: {p.suhu_oven}°C</p>}
                        {p.durasi_jam && <p><Clock className="h-3 w-3 inline mr-1" />Durasi: {p.durasi_jam} jam</p>}
                        <p><Scale className="h-3 w-3 inline mr-1" />Sebelum: {Number(p.jumlah_kg_sebelum).toLocaleString()} Kg</p>
                        {p.jumlah_kg_sesudah && (
                          <p><Scale className="h-3 w-3 inline mr-1" />Sesudah: {Number(p.jumlah_kg_sesudah).toLocaleString()} Kg</p>
                        )}
                        {p.penyusutan_kg && Number(p.penyusutan_kg) > 0 && (
                          <p className="text-orange-600">Penyusutan: {Number(p.penyusutan_kg).toLocaleString()} Kg</p>
                        )}
                      </div>
                      {p.status !== 'selesai' && (
                        <Button 
                          size="sm" 
                          className="mt-3"
                          onClick={() => {
                            setSelectedPengeringan(p);
                            setPengeringanDialogOpen(true);
                          }}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Selesaikan
                        </Button>
                      )}
                      {p.tanggal_selesai && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Selesai: {format(new Date(p.tanggal_selesai), "dd MMM yyyy HH:mm", { locale: localeId })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Penyimpanan Gudang */}
                {gudang.map((g) => (
                  <div key={g.id} className="relative pl-8 pb-6 border-l-2 border-organic-green">
                    <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-gradient-organic flex items-center justify-center">
                      <Warehouse className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className="bg-organic-green/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">Masuk Gudang</h4>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(g.tanggal_masuk), "dd MMM yyyy", { locale: localeId })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><Warehouse className="h-3 w-3 inline mr-1" />{g.lokasi_gudang}</p>
                        {g.rak_posisi && <p>Rak: {g.rak_posisi}</p>}
                        <p><Scale className="h-3 w-3 inline mr-1" />{Number(g.jumlah_kg).toLocaleString()} Kg</p>
                        {g.suhu_gudang && <p><Thermometer className="h-3 w-3 inline mr-1" />{g.suhu_gudang}°C</p>}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Dokumen */}
                {dokumen.map((d) => (
                  <div key={d.id} className="relative pl-8 pb-6 border-l-2 border-organic-green">
                    <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-gradient-organic flex items-center justify-center">
                      <FileText className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className="bg-organic-green/5 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">Dokumen: {d.jenis_dokumen.replace(/_/g, ' ')}</h4>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(d.tanggal_dokumen), "dd MMM yyyy", { locale: localeId })}
                        </span>
                      </div>
                      <p className="text-sm"><span className="text-muted-foreground">No:</span> {d.nomor_dokumen}</p>
                      {d.penerbit && <p className="text-sm"><span className="text-muted-foreground">Penerbit:</span> {d.penerbit}</p>}
                    </div>
                  </div>
                ))}

                {/* Penjualan */}
                {penjualan.map((s) => (
                  <div key={s.id} className="relative pl-8 pb-6 border-l-2 border-green-500">
                    <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <ShoppingCart className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-foreground">Penjualan</h4>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(s.tanggal_penjualan), "dd MMM yyyy", { locale: localeId })}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p><span className="text-muted-foreground">Invoice:</span> {s.nomor_invoice}</p>
                        <p><span className="text-muted-foreground">Pembeli:</span> {s.pembeli}</p>
                        <p><Scale className="h-3 w-3 inline mr-1" />{Number(s.jumlah_kg).toLocaleString()} Kg</p>
                        <p><DollarSign className="h-3 w-3 inline mr-1" />Rp {Number(s.harga_per_kg).toLocaleString()}/Kg</p>
                      </div>
                      <p className="text-lg font-bold text-green-600 mt-2">
                        Total: Rp {Number(s.total_harga || 0).toLocaleString()}
                      </p>
                      <Badge variant={s.status_pembayaran === 'lunas' ? 'default' : 'secondary'} className="mt-2">
                        {s.status_pembayaran === 'lunas' ? 'Lunas' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                ))}

                {/* Selesai marker */}
                {batch.status === 'selesai' && (
                  <div className="relative pl-8">
                    <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-gradient-organic flex items-center justify-center">
                      <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                    </div>
                    <div className="bg-gradient-to-r from-organic-green/10 to-organic-gold/10 rounded-lg p-4">
                      <h4 className="font-semibold text-foreground">Batch Selesai</h4>
                      <p className="text-sm text-muted-foreground">
                        Proses batch telah selesai
                      </p>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {pengeringan.length === 0 && gudang.length === 0 && dokumen.length === 0 && penjualan.length === 0 && batch.status === 'penerimaan' && (
                  <div className="relative pl-8">
                    <div className="absolute -left-3 top-0 w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                      <Circle className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        Menunggu proses selanjutnya...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Complete Pengeringan Dialog */}
      <Dialog open={pengeringanDialogOpen} onOpenChange={setPengeringanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selesaikan Pengeringan</DialogTitle>
            <DialogDescription>Catat hasil akhir proses pengeringan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Kadar Air Akhir (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={pengeringanComplete.kadar_air_akhir}
                onChange={(e) => setPengeringanComplete(prev => ({ ...prev, kadar_air_akhir: e.target.value }))}
                placeholder="0.0"
              />
            </div>
            <div>
              <Label>Jumlah Kg Sesudah Pengeringan</Label>
              <Input
                type="number"
                step="0.1"
                value={pengeringanComplete.jumlah_kg_sesudah}
                onChange={(e) => setPengeringanComplete(prev => ({ ...prev, jumlah_kg_sesudah: e.target.value }))}
                placeholder="0.0"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPengeringanDialogOpen(false)}>Batal</Button>
              <Button onClick={handleCompletePengeringan} className="bg-gradient-organic">Simpan & Selesai</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default BatchDetail;
