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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, Users, RefreshCw, MapPin, Map as MapIcon, Layers } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LandMapPreview, parseCoordinate } from "@/components/LandMapPreview";

interface Pengepul {
  id: string;
  kode_pengepul: string;
  nama: string;
}

interface ParsedLand {
  kode_lahan: string;
  kode_petani: string; // Auto-detected from kode_lahan
  lokasi_lahan: string;
  koordinat: string;
  koordinat_lat: number | null;
  koordinat_lng: number | null;
  koordinat_error?: string;
  status_lahan: string;
  error?: string;
  isValid: boolean;
  farmerId?: string; // Will be resolved during import
  farmerName?: string; // For display
}

interface ParsedFarmer {
  kode_petani: string;
  nama: string;
  alamat: string;
  alamat_rumah: string;
  koordinat_lat_rumah: number | null;
  koordinat_lng_rumah: number | null;
  koordinat_rumah_error?: string;
  is_organic: boolean;
  rata_rata_panen: number | null;
  regulasi: string; // "EU", "COR", "EU,COR", or ""
  nama_lahan: string;
  lokasi_lahan: string;
  koordinat: string;
  koordinat_lat: number | null;
  koordinat_lng: number | null;
  koordinat_error?: string;
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
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  // Function to refresh existing farmers map
  const refreshExistingFarmers = async () => {
    try {
      const { data: farmersData, error: farmersError } = await supabase
        .from("petani")
        .select("id, kode_petani");

      if (farmersError) throw farmersError;
      
      const farmersMap = new Map<string, string>();
      farmersData?.forEach(f => farmersMap.set(f.kode_petani.toUpperCase(), f.id));
      setExistingFarmers(farmersMap);
      return farmersMap;
    } catch (error) {
      console.error("Error refreshing farmers:", error);
      return existingFarmers;
    }
  };

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
        await refreshExistingFarmers();
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
    const template = `kode_petani;nama;alamat;alamat_rumah;koordinat_lat_rumah;koordinat_lng_rumah;is_organic;rata_rata_panen;regulasi
PK1;Nama Petani 1;Alamat Petani 1;RT 01 RW 02 Desa Pekuncen;-7.123456;109.234567;true;5.5;EU
PK2;Nama Petani 2;Alamat Petani 2;;;;false;4.2;COR
PK3;Nama Petani 3;Alamat Petani 3;RT 03 RW 01 Desa Pekuncen;-7.130000;109.240000;true;6.0;EU,COR`;
    
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_import_petani.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({
      title: "Template didownload",
      description: "Termasuk kolom alamat_rumah + koordinat rumah petani (opsional)",
    });
  };

  const downloadLandTemplate = () => {
    const template = `kode_lahan;lokasi_lahan;lat;long;status_lahan
PK1A;Desa ABC;-6,123;106,456;aktif
PK1B;Desa ABC;-6,125;106,458;aktif
PK2A;Desa XYZ;-6,789;106,123;aktif`;
    
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "template_import_lahan.csv";
    link.click();
    URL.revokeObjectURL(link.href);
    
    toast({
      title: "Template Lahan didownload",
      description: "Format kode_lahan: kode_petani + huruf (contoh: PK1A, PK1B untuk petani PK1). Kode lahan akan menjadi nama lahan.",
    });
  };

  // Extract farmer code from land code (e.g., "pk1a" -> "pk1", "pk12b" -> "pk12")
  const extractFarmerCodeFromLandCode = (landCode: string): string => {
    // Remove trailing letter(s) from land code to get farmer code
    // Pattern: kode_petani + suffix letter (a, b, c, etc.)
    const match = landCode.match(/^(.+?)([a-zA-Z])$/i);
    if (match) {
      return match[1].toUpperCase();
    }
    return landCode.toUpperCase();
  };

  // State for land import
  const [parsedLands, setParsedLands] = useState<ParsedLand[]>([]);
  const [importMode, setImportMode] = useState<'farmer' | 'land'>('farmer');

  const parseCSV = (content: string): ParsedFarmer[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    // Detect separator: semicolon or comma
    const firstLine = lines[0];
    const separator = firstLine.includes(";") ? ";" : ",";
    
    const headers = firstLine.split(separator).map(h => h.trim().toLowerCase());
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
    const rataRataIndex = headers.indexOf("rata_rata_panen");
    const regulasiIndex = headers.indexOf("regulasi");

    const seenCodes = new Set<string>();
    const parsed: ParsedFarmer[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line, separator);
      
      const kode_petani = values[codeIndex]?.trim() || "";
      const nama = values[namaIndex]?.trim() || "";
      const alamat = alamatIndex >= 0 ? values[alamatIndex]?.trim() || "" : "";
      const is_organic_raw = organicIndex >= 0 ? values[organicIndex]?.trim().toLowerCase() : "true";
      const is_organic = is_organic_raw === "true" || is_organic_raw === "1" || is_organic_raw === "ya" || is_organic_raw === "yes";
      
      // Parse rata-rata panen
      const rataRataRaw = rataRataIndex >= 0 ? values[rataRataIndex]?.trim() || "" : "";
      const rata_rata_panen = rataRataRaw ? parseFloat(rataRataRaw.replace(",", ".")) : null;
      
      // Parse regulasi (EU, COR, EU,COR)
      const regulasiRaw = regulasiIndex >= 0 ? values[regulasiIndex]?.trim().toUpperCase() || "" : "";
      const regulasi = regulasiRaw.split(",").map(r => r.trim()).filter(r => r === "EU" || r === "COR").join(",");

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
      }

      seenCodes.add(kode_petani.toUpperCase());

      parsed.push({
        kode_petani,
        nama,
        alamat,
        is_organic,
        rata_rata_panen: isNaN(rata_rata_panen as number) ? null : rata_rata_panen,
        regulasi,
        nama_lahan: "",
        lokasi_lahan: "",
        koordinat: "",
        koordinat_lat: null,
        koordinat_lng: null,
        status_lahan: "aktif",
        error,
        isValid,
        isUpdate,
        existingId,
      });
    }

    return parsed;
  };

  const parseLandCSV = (content: string): ParsedLand[] => {
    const lines = content.trim().split("\n");
    if (lines.length < 2) return [];

    const firstLine = lines[0];
    const separator = firstLine.includes(";") ? ";" : ",";
    
    const headers = firstLine.split(separator).map(h => h.trim().toLowerCase());
    const requiredHeaders = ["kode_lahan"];
    
    const hasRequiredHeaders = requiredHeaders.every(h => headers.includes(h));
    if (!hasRequiredHeaders) {
      toast({
        title: "Format tidak valid",
        description: "File harus memiliki kolom: kode_lahan",
        variant: "destructive",
      });
      return [];
    }

    const kodeLahanIndex = headers.indexOf("kode_lahan");
    const lokasiLahanIndex = headers.indexOf("lokasi_lahan");
    const latIndex = headers.indexOf("lat");
    const longIndex = headers.indexOf("long");
    const statusLahanIndex = headers.indexOf("status_lahan");

    const seenCodes = new Set<string>();
    const parsed: ParsedLand[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line, separator);
      
      const kode_lahan = values[kodeLahanIndex]?.trim() || "";
      const lokasi_lahan = lokasiLahanIndex >= 0 ? values[lokasiLahanIndex]?.trim() || "" : "";
      const latRaw = latIndex >= 0 ? values[latIndex]?.trim() || "" : "";
      const longRaw = longIndex >= 0 ? values[longIndex]?.trim() || "" : "";
      const status_lahan = statusLahanIndex >= 0 ? values[statusLahanIndex]?.trim() || "aktif" : "aktif";

      // Auto-detect farmer code from land code
      const kode_petani = extractFarmerCodeFromLandCode(kode_lahan);
      const farmerId = existingFarmers.get(kode_petani);

      // Parse coordinates
      let koordinat_lat: number | null = null;
      let koordinat_lng: number | null = null;
      let koordinat_error: string | undefined;
      let koordinat = "";

      if (latRaw || longRaw) {
        const latNum = parseFloat(latRaw.replace(",", "."));
        const longNum = parseFloat(longRaw.replace(",", "."));
        
        if (latRaw && isNaN(latNum)) {
          koordinat_error = "Lat tidak valid";
        } else if (longRaw && isNaN(longNum)) {
          koordinat_error = "Long tidak valid";
        } else if (latRaw && (latNum < -90 || latNum > 90)) {
          koordinat_error = "Lat harus antara -90 dan 90";
        } else if (longRaw && (longNum < -180 || longNum > 180)) {
          koordinat_error = "Long harus antara -180 dan 180";
        } else {
          koordinat_lat = latRaw ? latNum : null;
          koordinat_lng = longRaw ? longNum : null;
          if (koordinat_lat !== null && koordinat_lng !== null) {
            koordinat = `${koordinat_lat},${koordinat_lng}`;
          }
        }
      }

      let error: string | undefined;
      let isValid = true;

      if (!kode_lahan) {
        error = "Kode lahan wajib diisi";
        isValid = false;
      } else if (seenCodes.has(kode_lahan.toUpperCase())) {
        error = "Kode lahan duplikat di file";
        isValid = false;
      } else if (!farmerId) {
        error = `Petani ${kode_petani} tidak ditemukan`;
        isValid = false;
      } else if (koordinat_error) {
        error = koordinat_error;
        isValid = false;
      }

      seenCodes.add(kode_lahan.toUpperCase());

      // Get farmer name for display
      let farmerName = "";
      if (farmerId) {
        farmerName = kode_petani;
      }

      parsed.push({
        kode_lahan,
        kode_petani,
        lokasi_lahan,
        koordinat,
        koordinat_lat,
        koordinat_lng,
        koordinat_error,
        status_lahan,
        error,
        isValid,
        farmerId,
        farmerName,
      });
    }

    return parsed;
  };

  const parseCSVLine = (line: string, separator: string = ","): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
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
      if (importMode === 'land') {
        const parsed = parseLandCSV(content);
        setParsedLands(parsed);
        setParsedData([]);
      } else {
        const parsed = parseCSV(content);
        setParsedData(parsed);
        setParsedLands([]);
      }
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

  // Re-validate lands when existingFarmers changes (after farmer import)
  useEffect(() => {
    if (parsedLands.length > 0) {
      setParsedLands(prev => prev.map(land => {
        const kode_petani = extractFarmerCodeFromLandCode(land.kode_lahan);
        const farmerId = existingFarmers.get(kode_petani);
        
        let error: string | undefined;
        let isValid = true;
        
        if (!land.kode_lahan) {
          error = "Kode lahan wajib diisi";
          isValid = false;
        } else if (!farmerId) {
          error = `Petani ${kode_petani} tidak ditemukan`;
          isValid = false;
        } else if (land.koordinat_error) {
          error = land.koordinat_error;
          isValid = false;
        }
        
        return { 
          ...land, 
          kode_petani,
          farmerId, 
          farmerName: farmerId ? kode_petani : "",
          error, 
          isValid 
        };
      }));
    }
  }, [existingFarmers]);

  const handleImport = async () => {
    if (importMode === 'land') {
      await handleImportLands();
    } else {
      await handleImportFarmers();
    }
  };

  const handleImportFarmers = async () => {
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
              rata_rata_panen: farmer.rata_rata_panen,
              regulasi: farmer.regulasi || null,
              pengepul_id: selectedPengepulId && selectedPengepulId !== "none" ? selectedPengepulId : null,
            })
            .eq("id", farmer.existingId);

          if (error) throw error;
          updated++;
        } else {
          // Insert new farmer
          const { error } = await supabase
            .from("petani")
            .insert({
              kode_petani: farmer.kode_petani,
              nama: farmer.nama,
              alamat: farmer.alamat || null,
              is_organic: farmer.is_organic,
              rata_rata_panen: farmer.rata_rata_panen,
              regulasi: farmer.regulasi || null,
              pengepul_id: selectedPengepulId && selectedPengepulId !== "none" ? selectedPengepulId : null,
            });

          if (error) throw error;
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
      
      // Refresh existing farmers map so land import can find newly imported farmers
      await refreshExistingFarmers();
      
      onImportComplete();
    } else {
      toast({
        title: "Import gagal",
        description: "Tidak ada data yang berhasil diimport",
        variant: "destructive",
      });
    }
  };

  const handleImportLands = async () => {
    const validData = parsedLands.filter(d => d.isValid);
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
      const land = validData[i];
      
      try {
        if (land.farmerId) {
          // Check if land already exists by checking kode_lahan (nama_lahan) for the farmer
          const { data: existingLand } = await supabase
            .from("lahan")
            .select("id")
            .eq("petani_id", land.farmerId)
            .eq("nama_lahan", land.kode_lahan)
            .maybeSingle();

          if (existingLand) {
            // Update existing land
            await supabase
              .from("lahan")
              .update({
                lokasi: land.lokasi_lahan || null,
                koordinat: land.koordinat || null,
                status: land.status_lahan || "aktif",
              })
              .eq("id", existingLand.id);
            updated++;
          } else {
            // Insert new land - use kode_lahan as nama_lahan
            await supabase
              .from("lahan")
              .insert({
                petani_id: land.farmerId,
                nama_lahan: land.kode_lahan,
                lokasi: land.lokasi_lahan || null,
                koordinat: land.koordinat || null,
                status: land.status_lahan || "aktif",
              });
            success++;
          }
        }
      } catch (error) {
        console.error("Error processing land:", error);
        failed++;
      }

      setImportProgress(Math.round(((i + 1) / validData.length) * 100));
    }

    setImporting(false);
    setImportResults({ success, failed, updated });

    if (success > 0 || updated > 0) {
      toast({
        title: "Import lahan selesai",
        description: `${success} lahan baru, ${updated} diupdate${failed > 0 ? `, ${failed} gagal` : ""}`,
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
    setParsedLands([]);
    setImportResults(null);
    setImportProgress(0);
    setSelectedPengepulId("");
    setUpdateMode(true);
    setImportMode('farmer');
    onOpenChange(false);
  };

  const validCount = importMode === 'land' 
    ? parsedLands.filter(d => d.isValid).length 
    : parsedData.filter(d => d.isValid).length;
  const invalidCount = importMode === 'land'
    ? parsedLands.filter(d => !d.isValid).length
    : parsedData.filter(d => !d.isValid).length;
  const newCount = importMode === 'land'
    ? parsedLands.filter(d => d.isValid).length // All lands are new or update
    : parsedData.filter(d => d.isValid && !d.isUpdate).length;
  const updateCount = importMode === 'land'
    ? 0 // Lands don't have update mode tracking in preview
    : parsedData.filter(d => d.isValid && d.isUpdate).length;
  const totalRows = importMode === 'land' ? parsedLands.length : parsedData.length;
  
  // Get valid coordinates for map preview
  const mapCoordinates = importMode === 'land'
    ? parsedLands
        .filter(d => d.koordinat_lat !== null && d.koordinat_lng !== null && d.koordinat_lat !== 0 && d.koordinat_lng !== 0)
        .map(d => ({
          lat: d.koordinat_lat!,
          lng: d.koordinat_lng!,
          label: `${d.kode_lahan} (${d.kode_petani})`,
          lokasi: d.lokasi_lahan,
        }))
    : parsedData
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
            Import Data dari File CSV
          </DialogTitle>
          <DialogDescription>
            Pilih jenis data yang ingin diimport: Petani atau Lahan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Import Mode Tabs */}
          <Tabs value={importMode} onValueChange={(v) => {
            setImportMode(v as 'farmer' | 'land');
            setParsedData([]);
            setParsedLands([]);
            setImportResults(null);
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="farmer" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Import Petani
              </TabsTrigger>
              <TabsTrigger value="land" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Import Lahan
              </TabsTrigger>
            </TabsList>

            <TabsContent value="farmer" className="mt-4 space-y-4">
              {/* Farmer Settings Row */}
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

              {/* Farmer Download & Upload Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium mb-2">Download Template Petani</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Kolom: kode_petani, nama, alamat, is_organic, rata_rata_panen, regulasi
                  </p>
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template Petani
                  </Button>
                </div>

                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium mb-2">Upload File CSV Petani</p>
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
            </TabsContent>

            <TabsContent value="land" className="mt-4 space-y-4">
              {/* Land Info */}
              <div className="p-4 border rounded-lg bg-blue-500/10 border-blue-500/30">
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Format Kode Lahan
                </p>
                <p className="text-xs text-muted-foreground">
                  Kode lahan = kode petani + huruf suffix (a, b, c, dst). Contoh: <strong>PK1A</strong>, <strong>PK1B</strong> adalah lahan milik petani <strong>PK1</strong>.
                  <br />Sistem akan otomatis mendeteksi hubungan lahan dengan petani berdasarkan pola ini.
                </p>
              </div>

              {/* Land Download & Upload Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium mb-2">Download Template Lahan</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Kolom: kode_lahan, lokasi_lahan, lat, long, status_lahan
                  </p>
                  <Button variant="outline" onClick={downloadLandTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template Lahan
                  </Button>
                </div>

                <div className="p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium mb-2">Upload File CSV Lahan</p>
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
            </TabsContent>
          </Tabs>

          {/* Preview Data - Farmers */}
          {importMode === 'farmer' && parsedData.length > 0 && (
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
                    <Badge 
                      variant="destructive" 
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => setShowOnlyErrors(!showOnlyErrors)}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      {invalidCount} error {showOnlyErrors ? "(klik untuk semua)" : "(klik untuk filter)"}
                    </Badge>
                  )}
                </div>
              </div>
              
              <ScrollArea className="flex-1 max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Alamat</TableHead>
                      <TableHead>Organik</TableHead>
                      <TableHead>Rata-rata</TableHead>
                      <TableHead>Regulasi</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData
                      .filter(farmer => !showOnlyErrors || !farmer.isValid)
                      .map((farmer, index) => (
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
                        <TableCell className="max-w-[150px] truncate text-xs">{farmer.alamat || "-"}</TableCell>
                        <TableCell>
                          {farmer.is_organic ? (
                            <Badge variant="default" className="bg-green-600 text-xs">Organik</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Konv.</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {farmer.rata_rata_panen !== null ? `${farmer.rata_rata_panen} kg` : "-"}
                        </TableCell>
                        <TableCell>
                          {farmer.regulasi ? (
                            <div className="flex gap-1 flex-wrap">
                              {farmer.regulasi.includes("EU") && (
                                <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800 border-blue-300">EU</Badge>
                              )}
                              {farmer.regulasi.includes("COR") && (
                                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">COR</Badge>
                              )}
                            </div>
                          ) : "-"}
                        </TableCell>
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

          {/* Preview Data - Lands */}
          {importMode === 'land' && parsedLands.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col border rounded-lg">
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">Preview ({parsedLands.length} lahan)</span>
                  {validCount > 0 && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {validCount} valid
                    </Badge>
                  )}
                  {invalidCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => setShowOnlyErrors(!showOnlyErrors)}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      {invalidCount} error {showOnlyErrors ? "(klik untuk semua)" : "(klik untuk filter)"}
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
              
              <ScrollArea className="flex-1 max-h-[300px] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Status</TableHead>
                      <TableHead>Kode Lahan</TableHead>
                      <TableHead>Petani</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Lat</TableHead>
                      <TableHead>Long</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedLands
                      .filter(land => !showOnlyErrors || !land.isValid)
                      .map((land, index) => (
                      <TableRow 
                        key={index} 
                        className={!land.isValid ? "bg-destructive/5" : ""}
                      >
                        <TableCell>
                          {!land.isValid ? (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-medium">{land.kode_lahan || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {land.farmerId ? (
                            <Badge variant="outline" className="text-xs">{land.kode_petani}</Badge>
                          ) : (
                            <span className="text-destructive">{land.kode_petani}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[100px] truncate text-xs">{land.lokasi_lahan || "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{land.koordinat_lat?.toFixed(4) || "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{land.koordinat_lng?.toFixed(4) || "-"}</TableCell>
                        <TableCell className="text-xs">{land.status_lahan || "-"}</TableCell>
                        <TableCell className="text-destructive text-xs">
                          {land.error || ""}
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
          {totalRows > 0 && validCount > 0 && !importResults && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {validCount} {importMode === 'land' ? 'Lahan' : 'Petani'}
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