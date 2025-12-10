import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpFromLine, Leaf, Factory, Package } from "lucide-react";
import { GudangStok, usePenjualan } from "@/hooks/use-batch-panen";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface BarangKeluarGudangDialogProps {
  stokTersedia: GudangStok[];
  onSuccess: () => void;
}

export const BarangKeluarGudangDialog = ({ stokTersedia, onSuccess }: BarangKeluarGudangDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedStokId, setSelectedStokId] = useState<string>("");
  const [jumlahKg, setJumlahKg] = useState<string>("");
  const [pembeli, setPembeli] = useState("");
  const [alamatPembeli, setAlamatPembeli] = useState("");
  const [hargaPerKg, setHargaPerKg] = useState<string>("");
  const [metodePembayaran, setMetodePembayaran] = useState("transfer");
  const [catatan, setCatatan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addPenjualan } = usePenjualan();

  const selectedStok = stokTersedia.find(s => s.id === selectedStokId);
  const maxKg = selectedStok ? Number(selectedStok.jumlah_kg) : 0;

  const resetForm = () => {
    setSelectedStokId("");
    setJumlahKg("");
    setPembeli("");
    setAlamatPembeli("");
    setHargaPerKg("");
    setMetodePembayaran("transfer");
    setCatatan("");
  };

  const handleSubmit = async () => {
    if (!selectedStokId || !jumlahKg || !pembeli || !hargaPerKg) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field yang wajib diisi",
        variant: "destructive",
      });
      return;
    }

    const jumlah = Number(jumlahKg);
    if (jumlah <= 0 || jumlah > maxKg) {
      toast({
        title: "Error",
        description: `Jumlah harus antara 1 - ${maxKg} Kg`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedItem = stokTersedia.find(s => s.id === selectedStokId);
      if (!selectedItem) {
        throw new Error("Stok tidak ditemukan");
      }

      // Add penjualan record
      const penjualanResult = await addPenjualan({
        batch_id: selectedItem.batch_id,
        tanggal_penjualan: format(new Date(), "yyyy-MM-dd"),
        pembeli,
        alamat_pembeli: alamatPembeli || null,
        jumlah_kg: jumlah,
        harga_per_kg: Number(hargaPerKg),
        metode_pembayaran: metodePembayaran,
        status_pembayaran: "pending",
        tanggal_kirim: null,
        catatan: catatan || null,
      });

      if (!penjualanResult) {
        throw new Error("Gagal membuat penjualan");
      }

      // Update stok - reduce quantity or mark as keluar
      const sisaStok = maxKg - jumlah;
      const { supabase } = await import("@/integrations/supabase/client");
      
      if (sisaStok <= 0) {
        // Mark as keluar and set tanggal_keluar
        await supabase
          .from("gudang_stok")
          .update({
            status: "keluar",
            tanggal_keluar: format(new Date(), "yyyy-MM-dd"),
            jumlah_kg: 0,
            catatan: `Keluar untuk penjualan ke ${pembeli}. ${catatan}`.trim(),
          })
          .eq("id", selectedStokId);
      } else {
        // Reduce quantity
        await supabase
          .from("gudang_stok")
          .update({
            jumlah_kg: sisaStok,
            catatan: `${selectedItem.catatan || ""} | Keluar ${jumlah} Kg untuk penjualan ke ${pembeli}`.trim(),
          })
          .eq("id", selectedStokId);
      }

      toast({
        title: "Berhasil",
        description: `Barang keluar ${jumlah} Kg untuk ${pembeli} berhasil dicatat`,
      });

      resetForm();
      setOpen(false);
      onSuccess();
    } catch (error) {
      console.error("Error processing barang keluar:", error);
      toast({
        title: "Error",
        description: "Gagal memproses barang keluar",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalHarga = Number(jumlahKg || 0) * Number(hargaPerKg || 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <ArrowUpFromLine className="h-4 w-4" />
          Barang Keluar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="h-5 w-5" />
            Barang Keluar untuk Penjualan
          </DialogTitle>
          <DialogDescription>
            Catat barang keluar dari gudang untuk penjualan. Stok akan otomatis berkurang.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Select Stok */}
          <div className="space-y-2">
            <Label>Pilih Stok *</Label>
            <Select value={selectedStokId} onValueChange={setSelectedStokId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih stok gudang..." />
              </SelectTrigger>
              <SelectContent>
                {stokTersedia.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex items-center gap-2">
                      {item.is_organic ? (
                        <Leaf className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Factory className="h-3 w-3 text-slate-600" />
                      )}
                      <span>
                        {item.tipe_stok === 'produk_jadi' ? 'Produk Jadi' : 'Bahan Baku'} - {Number(item.jumlah_kg).toLocaleString()} Kg
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStok && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="flex items-center gap-2 mb-2">
                  {selectedStok.is_organic ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <Leaf className="h-3 w-3 mr-1" />
                      Organik
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
                      <Factory className="h-3 w-3 mr-1" />
                      Konvensional
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    <Package className="h-3 w-3 mr-1" />
                    {selectedStok.tipe_stok === 'produk_jadi' ? 'Produk Jadi' : 'Bahan Baku'}
                  </Badge>
                </div>
                <p>Lokasi: {selectedStok.lokasi_gudang}</p>
                <p className="font-medium text-emerald-600">Stok Tersedia: {maxKg.toLocaleString()} Kg</p>
              </div>
            )}
          </div>

          {/* Jumlah */}
          <div className="space-y-2">
            <Label>Jumlah Keluar (Kg) *</Label>
            <Input
              type="number"
              value={jumlahKg}
              onChange={(e) => setJumlahKg(e.target.value)}
              placeholder="Masukkan jumlah..."
              max={maxKg}
              min={1}
            />
            {Number(jumlahKg) > maxKg && (
              <p className="text-xs text-destructive">Jumlah melebihi stok tersedia ({maxKg} Kg)</p>
            )}
          </div>

          {/* Pembeli */}
          <div className="space-y-2">
            <Label>Nama Pembeli *</Label>
            <Input
              value={pembeli}
              onChange={(e) => setPembeli(e.target.value)}
              placeholder="Masukkan nama pembeli..."
            />
          </div>

          {/* Alamat Pembeli */}
          <div className="space-y-2">
            <Label>Alamat Pembeli</Label>
            <Input
              value={alamatPembeli}
              onChange={(e) => setAlamatPembeli(e.target.value)}
              placeholder="Masukkan alamat..."
            />
          </div>

          {/* Harga */}
          <div className="space-y-2">
            <Label>Harga per Kg (Rp) *</Label>
            <Input
              type="number"
              value={hargaPerKg}
              onChange={(e) => setHargaPerKg(e.target.value)}
              placeholder="Masukkan harga..."
            />
          </div>

          {/* Metode Pembayaran */}
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <Select value={metodePembayaran} onValueChange={setMetodePembayaran}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transfer Bank</SelectItem>
                <SelectItem value="tunai">Tunai</SelectItem>
                <SelectItem value="kredit">Kredit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Catatan tambahan..."
              rows={2}
            />
          </div>

          {/* Summary */}
          {Number(jumlahKg) > 0 && Number(hargaPerKg) > 0 && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">Total Penjualan:</p>
              <p className="text-2xl font-bold text-primary">
                Rp {totalHarga.toLocaleString()}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !selectedStokId || !jumlahKg || !pembeli || !hargaPerKg}
            >
              {isSubmitting ? "Memproses..." : "Simpan & Kurangi Stok"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
