import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, Users, RefreshCw, MapPin, Map as MapIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LandMapPreview, parseCoordinate } from "@/components/LandMapPreview";

interface Pengepul {
  id: string;
  kode_pengepul: string;
  nama: string;
}

interface ParsedFarmer {
  kode_petani: string;
  nama: string;
  alamat: string;
  is_organic: boolean;
  nama_lahan: string;
  lokasi_lahan: string;
  luas_lahan: number | null;
  koordinat: string;
  koordinat_lat: number | null;
  koordinat_lng: number | null;
  koordinat_error?: string;
  jenis_tanah: string;
  status_lahan: string;
  error?: string;
  isValid: boolean;
  isUpdate: boolean;
  existingId?: string;
}

interface FarmerBatchImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  onLandsUpdated?: () => void;
  existingCodes: string[];
}

export const FarmerBatchImport = ({
  open,
  onOpenChange,
  onImportComplete,
  onLandsUpdated,
  existingCodes,
}: FarmerBatchImportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedFarmer[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; updated: number } | null>(null);
  const [pengepulList, setPengepulList] = useState<Pengepul[]>([]);
  const [selectedPengepulId, setSelectedPengepulId] = useState<string>("");
  const [loadingPengepul, setLoadingPengepul] = useState(true);
  const [updateMode, setUpdateMode] = useState(true);
  const [existingFarmers, setExistingFarmers] = useState<Map<string, string>>(new Map());
  const [mapPreviewOpen, setMapPreviewOpen] = useState(false);

  // Fetch pengepul list and existing farmers on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingPengepul(true);
        
        // Fetch pengepul
        const { data: pengepulData, error: pengepulError } = await supabase
          .from("pengepul")
          .select("id, kode_pengepul, nama")
          .eq("status", "aktif")
          .order("nama");

        if (pengepulError) throw pengepulError;
        setPengepulList(pengepulData || []);

        // Fetch existing farmers for update mode
        const { data: farmersData, error: farmersError } = await supabase
          .from("petani")
          .select("id, kode_petani");

        if (farmersError) throw farmersError;
        
        const farmersMap = new Map<string, string>();
        farmersData?.forEach(f => farmersMap.set(f.kode_petani.toUpperCase(), f.id));
        setExistingFarmers(farmersMap);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingPengepul(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  const downloadTemplate = () => {
    const template = `kode_petani,nama,alamat,is_organic,nama_lahan,lokasi_lahan,luas_lahan,koordinat,jenis_tanah,status_lahan
P001,Nama Petani 1,Alamat Petani 1,true,Lahan Utama,Desa ABC,1.5,"-6.123,106.456",Lempung,aktif
P002,Nama Petani 2,Alamat Petani 2,false,Kebun Belakang,Desa XYZ,2.0,"-6.789,106.123",Berpasir,aktif`;
    
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_import_petani.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({
      title: "Template didownload",
      description: "Isi data petani pada file CSV lalu upload kembali",
    });
  };

  const parseCSV = (content: string): ParsedFarmer[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const requiredHeaders = ["kode_petani", "nama"];
    
    const hasRequiredHeaders = requiredHeaders.every(h => headers.includes(h));
    if (!hasRequiredHeaders) {
      toast({
        title: "Format tidak valid",
        description: "File harus memiliki kolom: kode_petani, nama",
        variant: "destructive",
      });
      return [];
    }

    const codeIndex = headers.indexOf("kode_petani");
    const namaIndex = headers.indexOf("nama");
    const alamatIndex = headers.indexOf("alamat");
    const organicIndex = headers.indexOf("is_organic");
    const namaLahanIndex = headers.indexOf("nama_lahan");
    const lokasiLahanIndex = headers.indexOf("lokasi_lahan");
    const luasLahanIndex = headers.indexOf("luas_lahan");
    const koordinatIndex = headers.indexOf("koordinat");
    const jenisTanahIndex = headers.indexOf("jenis_tanah");
    const statusLahanIndex = headers.indexOf("status_lahan");

    const seenCodes = new Set<string>();
    const parsed: ParsedFarmer[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle CSV with quoted values
      const values = parseCSVLine(line);
      
      const kode_petani = values[codeIndex]?.trim() || "";
      const nama = values[namaIndex]?.trim() || "";
      const alamat = alamatIndex >= 0 ? values[alamatIndex]?.trim() || "" : "";
      const is_organic_raw = organicIndex >= 0 ? values[organicIndex]?.trim().toLowerCase() : "true";
      const is_organic = is_organic_raw === "true" || is_organic_raw === "1" || is_organic_raw === "ya" || is_organic_raw === "yes";
      const nama_lahan = namaLahanIndex >= 0 ? values[namaLahanIndex]?.trim() || "" : "";
      const lokasi_lahan = lokasiLahanIndex >= 0 ? values[lokasiLahanIndex]?.trim() || "" : "";
      const luas_raw = luasLahanIndex >= 0 ? values[luasLahanIndex]?.trim() || "" : "";
      const luas_lahan = luas_raw ? parseFloat(luas_raw.replace(",", ".")) : null;
      const koordinat = koordinatIndex >= 0 ? values[koordinatIndex]?.trim() || "" : "";
      const jenis_tanah = jenisTanahIndex >= 0 ? values[jenisTanahIndex]?.trim() || "" : "";
      const status_lahan = statusLahanIndex >= 0 ? values[statusLahanIndex]?.trim() || "aktif" : "aktif";

      // Validate coordinates
      const coordResult = parseCoordinate(koordinat);
      const koordinat_lat = coordResult.isValid ? coordResult.lat : null;
      const koordinat_lng = coordResult.isValid ? coordResult.lng : null;
      const koordinat_error = coordResult.error;

      let error: string | undefined;
      let isValid = true;
      const existingId = existingFarmers.get(kode_petani.toUpperCase());
      const isUpdate = !!existingId;

      if (!kode_petani) {
        error = "Kode petani wajib diisi";
        isValid = false;
      } else if (!nama) {
        error = "Nama wajib diisi";
        isValid = false;
      } else if (seenCodes.has(kode_petani.toUpperCase())) {
        error = "Kode petani duplikat di file";
        isValid = false;
      } else if (existingId && !updateMode) {
        error = "Kode petani sudah ada (aktifkan mode update)";
        isValid = false;
      } else if (koordinat_error) {
        error = koordinat_error;
        isValid = false;
      }

      seenCodes.add(kode_petani.toUpperCase());

      parsed.push({
        kode_petani,
        nama,
        alamat,
        is_organic,
        nama_lahan,
        lokasi_lahan,
        luas_lahan,
        koordinat,
        koordinat_lat,
        koordinat_lng,
        koordinat_error,
        jenis_tanah,
        status_lahan,
        error,
        isValid,
        isUpdate,
        existingId,
      });
    }

    return parsed;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    
    return result.map(val => val.replace(/^"|"$/g, ""));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Format tidak valid",
        description: "Hanya file CSV yang didukung",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 1024 * 1024) {
      toast({
        title: "File terlalu besar",
        description: "Ukuran maksimal file adalah 1MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsed = parseCSV(content);
      setParsedData(parsed);
      setImportResults(null);
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Re-parse when update mode changes
  useEffect(() => {
    if (parsedData.length > 0) {
      // Re-validate based on new update mode
      setParsedData(prev => prev.map(farmer => {
        const existingId = existingFarmers.get(farmer.kode_petani.toUpperCase());
        const isUpdate = !!existingId;
        
        let error = farmer.error;
        let isValid = farmer.isValid;
        
        if (existingId && !updateMode) {
          error = "Kode petani sudah ada (aktifkan mode update)";
          isValid = false;
        } else if (farmer.error === "Kode petani sudah ada (aktifkan mode update)" && updateMode) {
          error = undefined;
          isValid = !!farmer.kode_petani && !!farmer.nama;
        }
        
        return { ...farmer, isUpdate, existingId, error, isValid };
      }));
    }
  }, [updateMode, existingFarmers]);

  const handleImport = async () => {
    const validData = parsedData.filter(d => d.isValid);
    if (validData.length === 0) {
      toast({
        title: "Tidak ada data valid",
        description: "Semua data memiliki error, perbaiki file CSV dan upload ulang",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    let success = 0;
    let failed = 0;
    let updated = 0;

    for (let i = 0; i < validData.length; i++) {
      const farmer = validData[i];
      
      try {
        if (farmer.isUpdate && farmer.existingId) {
          // Update existing farmer
          const { error } = await supabase
            .from("petani")
            .update({
              nama: farmer.nama,
              alamat: farmer.alamat || null,
              is_organic: farmer.is_organic,
              pengepul_id: selectedPengepulId && selectedPengepulId !== "none" ? selectedPengepulId : null,
            })
            .eq("id", farmer.existingId);

          if (error) throw error;

          // Update or create lahan if provided
          if (farmer.nama_lahan) {
            // Check if lahan exists for this farmer
            const { data: existingLahan } = await supabase
              .from("lahan")
              .select("id")
              .eq("petani_id", farmer.existingId)
              .maybeSingle();

            if (existingLahan) {
              await supabase
                .from("lahan")
                .update({
                  nama_lahan: farmer.nama_lahan,
                  lokasi: farmer.lokasi_lahan || null,
                  luas: farmer.luas_lahan,
                  koordinat: farmer.koordinat || null,
                  jenis_tanah: farmer.jenis_tanah || null,
                  status: farmer.status_lahan || "aktif",
                })
                .eq("id", existingLahan.id);
            } else {
              await supabase
                .from("lahan")
                .insert({
                  petani_id: farmer.existingId,
                  nama_lahan: farmer.nama_lahan,
                  lokasi: farmer.lokasi_lahan || null,
                  luas: farmer.luas_lahan,
                  koordinat: farmer.koordinat || null,
                  jenis_tanah: farmer.jenis_tanah || null,
                  status: farmer.status_lahan || "aktif",
                });
            }
          }

          updated++;
        } else {
          // Insert new farmer
          const { data: newFarmer, error } = await supabase
            .from("petani")
            .insert({
              kode_petani: farmer.kode_petani,
              nama: farmer.nama,
              alamat: farmer.alamat || null,
              is_organic: farmer.is_organic,
              pengepul_id: selectedPengepulId && selectedPengepulId !== "none" ? selectedPengepulId : null,
            })
            .select("id")
            .single();

          if (error) throw error;

          // Create lahan if provided
          if (newFarmer && farmer.nama_lahan) {
            await supabase
              .from("lahan")
              .insert({
                petani_id: newFarmer.id,
                nama_lahan: farmer.nama_lahan,
                lokasi: farmer.lokasi_lahan || null,
                luas: farmer.luas_lahan,
                koordinat: farmer.koordinat || null,
                jenis_tanah: farmer.jenis_tanah || null,
                status: farmer.status_lahan || "aktif",
              });
          }

          success++;
        }
      } catch (error) {
        console.error("Error processing farmer:", error);
        failed++;
      }

      setImportProgress(Math.round(((i + 1) / validData.length) * 100));
    }

    setImporting(false);
    setImportResults({ success, failed, updated });

    if (success > 0 || updated > 0) {
      toast({
        title: "Import selesai",
        description: `${success} petani baru, ${updated} diupdate${failed > 0 ? `, ${failed} gagal` : ""}`,
      });
      onImportComplete();
      onLandsUpdated?.();
    } else {
      toast({
        title: "Import gagal",
        description: "Tidak ada data yang berhasil diimport",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    setParsedData([]);
    setImportResults(null);
    setImportProgress(0);
    setSelectedPengepulId("");
    setUpdateMode(true);
    onOpenChange(false);
  };

  const validCount = parsedData.filter(d => d.isValid).length;
  const invalidCount = parsedData.filter(d => !d.isValid).length;
  const newCount = parsedData.filter(d => d.isValid && !d.isUpdate).length;
  const updateCount = parsedData.filter(d => d.isValid && d.isUpdate).length;
  
  // Get valid coordinates for map preview
  const mapCoordinates = parsedData
    .filter(d => d.koordinat_lat !== null && d.koordinat_lng !== null && d.koordinat_lat !== 0 && d.koordinat_lng !== 0)
    .map(d => ({
      lat: d.koordinat_lat!,
      lng: d.koordinat_lng!,
      label: `${d.nama_lahan || d.nama} (${d.kode_petani})`,
      lokasi: d.lokasi_lahan,
    }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Data Petani dari File CSV
          </DialogTitle>
          <DialogDescription>
            Download template, isi data petani & lahan, lalu upload untuk import batch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Settings Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pengepul Selection */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" />
                <p className="text-sm font-medium">Pengepul (Opsional)</p>
              </div>
              <Select
                value={selectedPengepulId}
                onValueChange={setSelectedPengepulId}
                disabled={loadingPengepul || importing}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder={loadingPengepul ? "Memuat..." : "Pilih pengepul"} />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  <SelectItem value="none">Tidak ada pengepul</SelectItem>
                  {pengepulList.map((pengepul) => (
                    <SelectItem key={pengepul.id} value={pengepul.id}>
                      {pengepul.kode_pengepul} - {pengepul.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Update Mode Toggle */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4" />
                <p className="text-sm font-medium">Mode Update</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  id="update-mode"
                  checked={updateMode}
                  onCheckedChange={setUpdateMode}
                  disabled={importing}
                />
                <Label htmlFor="update-mode" className="text-sm text-muted-foreground">
                  {updateMode ? "Update data jika kode petani sudah ada" : "Skip jika kode petani sudah ada"}
                </Label>
              </div>
            </div>
          </div>

          {/* Download & Upload Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm font-medium mb-2">Download Template CSV</p>
              <p className="text-xs text-muted-foreground mb-3">
                Kolom: kode_petani, nama, alamat, is_organic, nama_lahan, lokasi_lahan, luas_lahan, koordinat, jenis_tanah, status_lahan
              </p>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm font-medium mb-2">Upload File CSV</p>
              <p className="text-xs text-muted-foreground mb-3">
                Format: CSV (max 1MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Pilih File CSV
              </Button>
            </div>
          </div>

          {/* Preview Data */}
          {parsedData.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col border rounded-lg">
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Preview ({parsedData.length} baris)</span>
                  {newCount > 0 && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {newCount} baru
                    </Badge>
                  )}
                  {updateCount > 0 && (
                    <Badge variant="secondary" className="bg-blue-600 text-white">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {updateCount} update
                    </Badge>
                  )}
                  {invalidCount > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      {invalidCount} error
                    </Badge>
                  )}
                </div>
                {/* Map Preview Button */}
                {mapCoordinates.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setMapPreviewOpen(true)}
                  >
                    <MapIcon className="h-4 w-4 mr-1" />
                    Lihat di Peta ({mapCoordinates.length})
                  </Button>
                )}
              </div>
              
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>Organik</TableHead>
                      <TableHead>Lahan</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Luas</TableHead>
                      <TableHead>Koordinat</TableHead>
                      <TableHead>Jenis Tanah</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((farmer, index) => (
                      <TableRow 
                        key={index} 
                        className={
                          !farmer.isValid 
                            ? "bg-destructive/5" 
                            : farmer.isUpdate 
                              ? "bg-blue-500/5" 
                              : ""
                        }
                      >
                        <TableCell>
                          {!farmer.isValid ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : farmer.isUpdate ? (
                            <RefreshCw className="h-4 w-4 text-blue-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{farmer.kode_petani || "-"}</TableCell>
                        <TableCell>{farmer.nama || "-"}</TableCell>
                        <TableCell className="max-w-[100px] truncate text-xs">{farmer.alamat || "-"}</TableCell>
                        <TableCell>
                          {farmer.is_organic ? (
                            <Badge variant="default" className="bg-green-600 text-xs">Organik</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Konv.</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{farmer.nama_lahan || "-"}</TableCell>
                        <TableCell className="max-w-[60px] truncate text-xs">{farmer.lokasi_lahan || "-"}</TableCell>
                        <TableCell className="text-xs">{farmer.luas_lahan ?? "-"}</TableCell>
                        <TableCell className="max-w-[60px] truncate text-xs">{farmer.koordinat || "-"}</TableCell>
                        <TableCell className="text-xs">{farmer.jenis_tanah || "-"}</TableCell>
                        <TableCell className="text-xs">{farmer.status_lahan || "-"}</TableCell>
                        <TableCell className="text-destructive text-xs">
                          {farmer.error || (farmer.isUpdate ? "Update" : "")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {/* Import Progress */}
          {importing && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Mengimport data...</span>
              </div>
              <Progress value={importProgress} />
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm font-medium mb-2">Hasil Import:</p>
              <div className="flex gap-4 flex-wrap">
                {importResults.success > 0 && (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {importResults.success} baru
                  </Badge>
                )}
                {importResults.updated > 0 && (
                  <Badge variant="secondary" className="bg-blue-600 text-white">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    {importResults.updated} diupdate
                  </Badge>
                )}
                {importResults.failed > 0 && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {importResults.failed} gagal
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {importResults ? "Tutup" : "Batal"}
          </Button>
          {parsedData.length > 0 && validCount > 0 && !importResults && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {validCount} Petani
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
      
      {/* Map Preview Dialog */}
      <LandMapPreview
        open={mapPreviewOpen}
        onOpenChange={setMapPreviewOpen}
        coordinates={mapCoordinates}
      />
    </Dialog>
  );
};