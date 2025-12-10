import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Pengepul {
  id: string;
  kode_pengepul: string;
  nama: string;
}

interface ParsedFarmer {
  kode_petani: string;
  nama: string;
  alamat: string;
  no_telepon: string;
  is_organic: boolean;
  error?: string;
  isValid: boolean;
}

interface FarmerBatchImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  existingCodes: string[];
}

export const FarmerBatchImport = ({
  open,
  onOpenChange,
  onImportComplete,
  existingCodes,
}: FarmerBatchImportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedData, setParsedData] = useState<ParsedFarmer[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null);
  const [pengepulList, setPengepulList] = useState<Pengepul[]>([]);
  const [selectedPengepulId, setSelectedPengepulId] = useState<string>("");
  const [loadingPengepul, setLoadingPengepul] = useState(true);

  // Fetch pengepul list on mount
  useEffect(() => {
    const fetchPengepul = async () => {
      try {
        setLoadingPengepul(true);
        const { data, error } = await supabase
          .from("pengepul")
          .select("id, kode_pengepul, nama")
          .eq("status", "aktif")
          .order("nama");

        if (error) throw error;
        setPengepulList(data || []);
      } catch (error) {
        console.error("Error fetching pengepul:", error);
      } finally {
        setLoadingPengepul(false);
      }
    };

    if (open) {
      fetchPengepul();
    }
  }, [open]);

  const downloadTemplate = () => {
    const template = `kode_petani,nama,alamat,no_telepon,is_organic
P001,Nama Petani 1,Alamat Petani 1,08123456789,true
P002,Nama Petani 2,Alamat Petani 2,08987654321,false`;
    
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
    const teleponIndex = headers.indexOf("no_telepon");
    const organicIndex = headers.indexOf("is_organic");

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
      const no_telepon = teleponIndex >= 0 ? values[teleponIndex]?.trim() || "" : "";
      const is_organic_raw = organicIndex >= 0 ? values[organicIndex]?.trim().toLowerCase() : "true";
      const is_organic = is_organic_raw === "true" || is_organic_raw === "1" || is_organic_raw === "ya" || is_organic_raw === "yes";

      let error: string | undefined;
      let isValid = true;

      if (!kode_petani) {
        error = "Kode petani wajib diisi";
        isValid = false;
      } else if (!nama) {
        error = "Nama wajib diisi";
        isValid = false;
      } else if (seenCodes.has(kode_petani.toUpperCase())) {
        error = "Kode petani duplikat di file";
        isValid = false;
      } else if (existingCodes.map(c => c.toUpperCase()).includes(kode_petani.toUpperCase())) {
        error = "Kode petani sudah ada di database";
        isValid = false;
      }

      seenCodes.add(kode_petani.toUpperCase());

      parsed.push({
        kode_petani,
        nama,
        alamat,
        no_telepon,
        is_organic,
        error,
        isValid,
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

    for (let i = 0; i < validData.length; i++) {
      const farmer = validData[i];
      
      const { error } = await supabase
        .from("petani")
        .insert({
          kode_petani: farmer.kode_petani,
          nama: farmer.nama,
          alamat: farmer.alamat || null,
          no_telepon: farmer.no_telepon || null,
          is_organic: farmer.is_organic,
          pengepul_id: selectedPengepulId || null,
        });

      if (error) {
        console.error("Error inserting farmer:", error);
        failed++;
      } else {
        success++;
      }

      setImportProgress(Math.round(((i + 1) / validData.length) * 100));
    }

    setImporting(false);
    setImportResults({ success, failed });

    if (success > 0) {
      toast({
        title: "Import selesai",
        description: `${success} petani berhasil diimport${failed > 0 ? `, ${failed} gagal` : ""}`,
      });
      onImportComplete();
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
    onOpenChange(false);
  };

  const validCount = parsedData.filter(d => d.isValid).length;
  const invalidCount = parsedData.filter(d => !d.isValid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Data Petani dari File CSV
          </DialogTitle>
          <DialogDescription>
            Download template, isi data petani, lalu upload untuk import batch
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Step 1: Select Pengepul */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              <p className="text-sm font-medium">Langkah 1: Pilih Pengepul (Opsional)</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Jika dipilih, semua petani yang diimport akan otomatis terhubung ke pengepul ini
            </p>
            <Select
              value={selectedPengepulId}
              onValueChange={setSelectedPengepulId}
              disabled={loadingPengepul || importing}
            >
              <SelectTrigger className="w-[300px] bg-background">
                <SelectValue placeholder={loadingPengepul ? "Memuat..." : "Pilih pengepul (opsional)"} />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="">Tidak ada pengepul</SelectItem>
                {pengepulList.map((pengepul) => (
                  <SelectItem key={pengepul.id} value={pengepul.id}>
                    {pengepul.kode_pengepul} - {pengepul.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedPengepulId && (
              <Badge variant="secondary" className="mt-2">
                Pengepul: {pengepulList.find(p => p.id === selectedPengepulId)?.nama}
              </Badge>
            )}
          </div>

          {/* Step 2: Download Template */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <p className="text-sm font-medium mb-2">Langkah 2: Download Template CSV</p>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* Step 3: Upload File */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <p className="text-sm font-medium mb-2">Langkah 3: Upload File CSV</p>
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

          {/* Preview Data */}
          {parsedData.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col border rounded-lg">
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Preview Data ({parsedData.length} baris)</span>
                  {validCount > 0 && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {validCount} valid
                    </Badge>
                  )}
                  {invalidCount > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      {invalidCount} error
                    </Badge>
                  )}
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead>Kode Petani</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>No. Telepon</TableHead>
                      <TableHead>Organik</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((farmer, index) => (
                      <TableRow key={index} className={!farmer.isValid ? "bg-destructive/5" : ""}>
                        <TableCell>
                          {farmer.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{farmer.kode_petani || "-"}</TableCell>
                        <TableCell>{farmer.nama || "-"}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{farmer.alamat || "-"}</TableCell>
                        <TableCell>{farmer.no_telepon || "-"}</TableCell>
                        <TableCell>
                          {farmer.is_organic ? (
                            <Badge variant="default" className="bg-green-600">Organik</Badge>
                          ) : (
                            <Badge variant="secondary">Konvensional</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-destructive text-sm">
                          {farmer.error || ""}
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
              <div className="flex gap-4">
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {importResults.success} berhasil
                </Badge>
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
    </Dialog>
  );
};
