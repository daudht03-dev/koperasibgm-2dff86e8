import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackagingLabel } from "@/components/PackagingLabel";
import { PrintPreviewDialog } from "@/components/PrintPreviewDialog";
import { useFarmers } from "@/hooks/use-farmers";
import { useLabelSettings, LabelSettings } from "@/hooks/use-label-settings";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { Printer, Settings, FileDown, Edit, LayoutGrid, Palette, FileText, AlertCircle, Download, ChevronDown, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { toast } from "@/hooks/use-toast";
import { useReactToPrint } from "react-to-print";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CustomField } from "@/components/CustomFieldsManager";

export const LabelManagement = () => {
  const { farmers, updateFarmer, refetch: refetchFarmers } = useFarmers();
  const { labelSettings, getLabelSettingByFarmerId, upsertLabelSetting } = useLabelSettings();
  const { profile } = useCompanyProfile();
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [selectedFarmerIds, setSelectedFarmerIds] = useState<string[]>([]);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [bulkPrintDialogOpen, setBulkPrintDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [customFieldDialogOpen, setCustomFieldDialogOpen] = useState(false);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "configured" | "not_configured">("all");
  const [sortField, setSortField] = useState<"nama" | "kode_petani" | "status">("nama");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const printRef = useRef<HTMLDivElement>(null);
  const singleLabelRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const [currentSettings, setCurrentSettings] = useState<Partial<LabelSettings>>({
    eu_certified: false,
    cor_nop_certified: false,
    sni_certified: false,
    is_organic: true,
  });

  const [bulkSettings, setBulkSettings] = useState<Partial<LabelSettings>>({
    eu_certified: false,
    cor_nop_certified: false,
    sni_certified: false,
    is_organic: true,
  });

  // Helper function to ensure template_settings is an array
  const getTemplateElements = () => {
    const settings = profile?.template_settings;
    return Array.isArray(settings) ? settings : undefined;
  };

  // Real-time subscription to petani table updates
  useEffect(() => {
    const channel = supabase
      .channel('petani-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'petani'
        },
        () => {
          refetchFarmers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchFarmers]);

  const handleOpenCustomFields = async (farmerId: string) => {
    setSelectedFarmerId(farmerId);
    const farmer = farmers.find(f => f.id === farmerId);
    if (farmer?.custom_data) {
      setCustomFieldValues(farmer.custom_data as Record<string, string>);
    } else {
      setCustomFieldValues({});
    }
    setFieldErrors({});
    setCustomFieldDialogOpen(true);
  };

  const validateField = (field: CustomField, value: string): string | null => {
    // Check required
    if (field.required && (!value || value.trim() === '')) {
      return `${field.label} wajib diisi`;
    }

    if (!value) return null;

    // Validate by type
    switch (field.type) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          return `${field.label} harus berupa angka`;
        }
        if (field.min !== undefined && num < field.min) {
          return `${field.label} minimal ${field.min}`;
        }
        if (field.max !== undefined && num > field.max) {
          return `${field.label} maksimal ${field.max}`;
        }
        break;
      
      case 'date':
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(value)) {
          return `${field.label} harus berformat tanggal yang valid`;
        }
        break;
      
      case 'dropdown':
        if (field.options && !field.options.includes(value)) {
          return `${field.label} harus salah satu dari: ${field.options.join(', ')}`;
        }
        break;
    }

    return null;
  };

  const handleSaveCustomFields = async () => {
    const errors: Record<string, string> = {};
    const fields = getCustomFields();

    // Validate all fields
    fields.forEach((field: CustomField) => {
      const value = customFieldValues[field.id] || '';
      const error = validateField(field, value);
      if (error) {
        errors[field.id] = error;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({
        title: "Validasi Gagal",
        description: "Mohon perbaiki error pada form",
        variant: "destructive",
      });
      return;
    }

    const success = await updateFarmer(selectedFarmerId, {
      custom_data: customFieldValues as any
    });
    
    if (success) {
      setCustomFieldDialogOpen(false);
      setFieldErrors({});
      toast({
        title: "Berhasil",
        description: "Data custom field berhasil disimpan dan label akan otomatis terupdate",
      });
    }
  };

  const getCustomFields = (): CustomField[] => {
    if (!profile?.custom_fields || !Array.isArray(profile.custom_fields)) {
      return [];
    }
    // Migrate old fields to new structure with defaults for backward compatibility
    return (profile.custom_fields as any[]).map(field => ({
      id: field.id,
      label: field.label,
      enabled: field.enabled ?? true,
      type: field.type || 'text',
      defaultValue: field.defaultValue || "",
      required: field.required || false,
      options: field.options || [],
      min: field.min,
      max: field.max,
    }));
  };

  const handleOpenSettings = async (farmerId: string) => {
    setSelectedFarmerId(farmerId);
    const existing = await getLabelSettingByFarmerId(farmerId);
    
    if (existing) {
      setCurrentSettings(existing);
    } else {
      setCurrentSettings({
        petani_id: farmerId,
        eu_certified: false,
        cor_nop_certified: false,
        sni_certified: false,
        is_organic: true,
      });
    }
    setSettingsDialogOpen(true);
  };

  const handleSaveSettings = async () => {
    const success = await upsertLabelSetting({
      ...currentSettings,
      petani_id: selectedFarmerId,
    });
    
    if (success) {
      setSettingsDialogOpen(false);
    }
  };

  const handlePreviewLabel = async (farmerId: string) => {
    setSelectedFarmerId(farmerId);
    const existing = await getLabelSettingByFarmerId(farmerId);
    
    if (existing) {
      setCurrentSettings(existing);
    } else {
      setCurrentSettings({
        petani_id: farmerId,
        eu_certified: false,
        cor_nop_certified: false,
        sni_certified: false,
        is_organic: true,
      });
    }
    setPreviewDialogOpen(true);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Label_${farmers.find(f => f.id === selectedFarmerId)?.nama || 'Petani'}`,
  });

  const handleBulkPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Label_Semua_Petani',
  });

  const handleSelectFarmer = (farmerId: string, checked: boolean) => {
    if (checked) {
      setSelectedFarmerIds(prev => [...prev, farmerId]);
    } else {
      setSelectedFarmerIds(prev => prev.filter(id => id !== farmerId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFarmerIds(paginatedFarmers.map(f => f.id));
    } else {
      setSelectedFarmerIds([]);
    }
  };

  const handleBulkEdit = () => {
    if (selectedFarmerIds.length === 0) {
      toast({
        title: "Pilih Petani",
        description: "Silakan pilih minimal satu petani untuk diedit",
        variant: "destructive",
      });
      return;
    }
    setBulkEditDialogOpen(true);
  };

  const handleSaveBulkSettings = async () => {
    let successCount = 0;
    let failCount = 0;

    for (const farmerId of selectedFarmerIds) {
      const success = await upsertLabelSetting({
        ...bulkSettings,
        petani_id: farmerId,
      });
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (failCount === 0) {
      toast({
        title: "Berhasil",
        description: `Pengaturan berhasil disimpan untuk ${successCount} petani`,
      });
      setBulkEditDialogOpen(false);
      setSelectedFarmerIds([]);
    } else {
      toast({
        title: "Sebagian Berhasil",
        description: `${successCount} berhasil, ${failCount} gagal`,
        variant: "destructive",
      });
    }
  };

  const handleDownloadIndividualJPG = async (farmerId: string, farmerName: string) => {
    const labelElement = singleLabelRefs.current[farmerId];
    if (!labelElement) {
      toast({
        title: "Error",
        description: "Label tidak ditemukan",
        variant: "destructive",
      });
      return;
    }
    
    try {
      toast({
        title: "Generating JPG...",
        description: "Mohon tunggu sebentar",
      });
      
      const canvas = await html2canvas(labelElement, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `label-${farmerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast({
            title: "Berhasil",
            description: "Label JPG berhasil didownload",
          });
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Error generating JPG:', error);
      toast({
        title: "Error",
        description: "Gagal membuat JPG",
        variant: "destructive",
      });
    }
  };

  const handleDownloadIndividualPDF = async (farmerId: string, farmerName: string) => {
    const labelElement = singleLabelRefs.current[farmerId];
    if (!labelElement) {
      toast({
        title: "Error",
        description: "Label tidak ditemukan",
        variant: "destructive",
      });
      return;
    }
    
    try {
      toast({
        title: "Generating PDF...",
        description: "Mohon tunggu sebentar",
      });
      
      const canvas = await html2canvas(labelElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`label-${farmerName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Berhasil",
        description: "Label PDF berhasil didownload",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Gagal membuat PDF",
        variant: "destructive",
      });
    }
  };

  const handleBatchDownloadJPG = async () => {
    if (selectedFarmerIds.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu petani",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generating JPGs...",
        description: `Membuat ${selectedFarmerIds.length} label JPG...`,
      });

      const zip = new JSZip();
      
      for (const farmerId of selectedFarmerIds) {
        const labelElement = singleLabelRefs.current[farmerId];
        const farmer = farmers.find(f => f.id === farmerId);
        
        if (!labelElement || !farmer) continue;
        
        const canvas = await html2canvas(labelElement, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          }, 'image/jpeg', 0.95);
        });
        
        const fileName = `label-${farmer.nama.replace(/\s+/g, '-')}-${farmer.kode_petani}.jpg`;
        zip.file(fileName, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `labels-batch-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Berhasil",
        description: `${selectedFarmerIds.length} label JPG berhasil didownload`,
      });
    } catch (error) {
      console.error('Error generating batch JPG:', error);
      toast({
        title: "Error",
        description: "Gagal membuat batch JPG",
        variant: "destructive",
      });
    }
  };

  const handleBatchDownloadPDF = async () => {
    if (selectedFarmerIds.length === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu petani",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Generating PDF...",
        description: `Membuat PDF dengan ${selectedFarmerIds.length} label...`,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let isFirstPage = true;

      for (const farmerId of selectedFarmerIds) {
        const labelElement = singleLabelRefs.current[farmerId];
        
        if (!labelElement) continue;
        
        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        const canvas = await html2canvas(labelElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;
        
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      }
      
      pdf.save(`labels-batch-${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast({
        title: "Berhasil",
        description: `PDF dengan ${selectedFarmerIds.length} label berhasil didownload`,
      });
    } catch (error) {
      console.error('Error generating batch PDF:', error);
      toast({
        title: "Error",
        description: "Gagal membuat batch PDF",
        variant: "destructive",
      });
    }
  };

  const selectedFarmer = farmers.find(f => f.id === selectedFarmerId);

  // Toggle sort
  const handleSort = (field: "nama" | "kode_petani" | "status") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Filter and sort farmers
  const filteredAndSortedFarmers = farmers
    .filter((farmer) => {
      const matchesSearch = 
        farmer.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        farmer.kode_petani.toLowerCase().includes(searchQuery.toLowerCase());
      
      const hasSettings = labelSettings.some(s => s.petani_id === farmer.id);
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "configured" && hasSettings) ||
        (statusFilter === "not_configured" && !hasSettings);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let compareValue = 0;
      
      if (sortField === "nama") {
        compareValue = a.nama.localeCompare(b.nama);
      } else if (sortField === "kode_petani") {
        compareValue = a.kode_petani.localeCompare(b.kode_petani);
      } else if (sortField === "status") {
        const aHasSettings = labelSettings.some(s => s.petani_id === a.id);
        const bHasSettings = labelSettings.some(s => s.petani_id === b.id);
        compareValue = (aHasSettings === bHasSettings) ? 0 : aHasSettings ? -1 : 1;
      }
      
      return sortDirection === "asc" ? compareValue : -compareValue;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedFarmers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFarmers = filteredAndSortedFarmers.slice(startIndex, endIndex);

  // Reset to page 1 when search or filter changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: "all" | "configured" | "not_configured") => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: "nama" | "kode_petani" | "status" }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortDirection === "asc" ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Manajemen Label Kemasan
              </CardTitle>
              <CardDescription>
                Kelola dan cetak label kemasan untuk setiap petani
              </CardDescription>
            </div>
            <Link to="/label-settings">
              <Button variant="outline" className="gap-2">
                <Palette className="h-4 w-4" />
                Kustomisasi Label
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Section */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama petani atau kode..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
              </div>
              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="configured">Sudah Diatur</SelectItem>
                  <SelectItem value="not_configured">Belum Diatur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(searchQuery || statusFilter !== "all") && (
              <p className="text-sm text-muted-foreground">
                Menampilkan {filteredAndSortedFarmers.length} dari {farmers.length} petani
                {totalPages > 1 && ` (Halaman ${currentPage} dari ${totalPages})`}
              </p>
            )}
          </div>

          {/* Selection Actions */}
          <div className="mb-4 flex justify-between items-center">
            <div className="flex gap-2">
              {selectedFarmerIds.length > 0 && (
                <>
                  <Button variant="outline" onClick={handleBulkEdit} className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit {selectedFarmerIds.length} Petani
                  </Button>
                  <Button onClick={() => setPrintPreviewOpen(true)} className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Preview Grid ({selectedFarmerIds.length})
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Batch Download ({selectedFarmerIds.length})
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={handleBatchDownloadJPG}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Semua JPG (ZIP)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleBatchDownloadPDF}>
                        <Download className="h-4 w-4 mr-2" />
                        Download Semua PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedFarmerIds([])}
                  >
                    Batalkan Pilihan
                  </Button>
                </>
              )}
            </div>
            <Dialog open={bulkPrintDialogOpen} onOpenChange={setBulkPrintDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Cetak Semua Label
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cetak Semua Label</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div ref={printRef} className="space-y-8 print:space-y-0">
                    {farmers.map((farmer) => {
                      const settings = labelSettings.find(s => s.petani_id === farmer.id);
                      return (
                        <div key={farmer.id} className="flex justify-center">
                          <PackagingLabel
                            farmerName={farmer.nama}
                            farmerCode={farmer.kode_petani}
                            farmerLogo={farmer.logo_url}
                            farmerId={farmer.id}
                            euCertified={settings?.eu_certified || false}
                            corNopCertified={settings?.cor_nop_certified || false}
                            sniCertified={settings?.sni_certified || false}
                            isOrganic={settings?.is_organic !== false}
                            companyName={profile?.nama_perusahaan}
                            customColors={profile?.label_primary_color ? {
                              primary: profile.label_primary_color,
                              backgroundStart: profile.label_background_start || "40 100% 97%",
                              backgroundEnd: profile.label_background_end || "33 100% 87%",
                            } : undefined}
                            customFont={profile?.label_font_family}
                            customLogo={profile?.logo_url}
                            qrSize={profile?.qr_size}
                            qrErrorCorrection={profile?.qr_error_correction as 'L' | 'M' | 'Q' | 'H'}
                            qrLogo={profile?.qr_logo_url}
                            qrLogoSize={profile?.qr_logo_size}
                            showForPrint={true}
                            templateElements={getTemplateElements()}
                            customData={farmer.custom_data as Record<string, string>}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <Button onClick={handleBulkPrint} className="w-full">
                    <Printer className="h-4 w-4 mr-2" />
                    Cetak Semua
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedFarmerIds.length === paginatedFarmers.length && paginatedFarmers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 font-medium hover:bg-accent"
                    onClick={() => handleSort("nama")}
                  >
                    Nama Petani
                    <SortIcon field="nama" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 font-medium hover:bg-accent"
                    onClick={() => handleSort("kode_petani")}
                  >
                    Kode
                    <SortIcon field="kode_petani" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 font-medium hover:bg-accent"
                    onClick={() => handleSort("status")}
                  >
                    Status Label
                    <SortIcon field="status" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFarmers.map((farmer) => {
                const hasSettings = labelSettings.some(s => s.petani_id === farmer.id);
                return (
                  <TableRow key={farmer.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedFarmerIds.includes(farmer.id)}
                        onCheckedChange={(checked) => handleSelectFarmer(farmer.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{farmer.nama}</TableCell>
                    <TableCell>{farmer.kode_petani}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs ${hasSettings ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {hasSettings ? 'Sudah Diatur' : 'Belum Diatur'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCustomFields(farmer.id)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Field
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenSettings(farmer.id)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Atur
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handlePreviewLabel(farmer.id)}
                      >
                        <Printer className="h-4 w-4 mr-1" />
                        Cetak
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownloadIndividualJPG(farmer.id, farmer.nama)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download JPG
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadIndividualPDF(farmer.id, farmer.nama)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
              {paginatedFarmers.length === 0 && farmers.length > 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Tidak ada petani yang sesuai dengan pencarian</p>
                  </TableCell>
                </TableRow>
              )}
              {farmers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Belum ada data petani
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredAndSortedFarmers.length)} dari {filteredAndSortedFarmers.length} petani
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNum)}
                          isActive={currentPage === pageNum}
                          className="cursor-pointer"
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pengaturan Label - {selectedFarmer?.nama}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Status Produk</Label>
              <RadioGroup
                value={currentSettings.is_organic ? "organic" : "conventional"}
                onValueChange={(value) => 
                  setCurrentSettings({ ...currentSettings, is_organic: value === "organic" })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="organic" id="organic" />
                  <label htmlFor="organic" className="text-sm font-medium cursor-pointer">Organik</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="conventional" id="conventional" />
                  <label htmlFor="conventional" className="text-sm font-medium cursor-pointer">Konvensional</label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Sertifikasi</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="eu"
                  checked={currentSettings.eu_certified}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({ ...currentSettings, eu_certified: checked as boolean })
                  }
                />
                <label htmlFor="eu" className="text-sm font-medium">EU</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cor-nop"
                  checked={currentSettings.cor_nop_certified}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({ ...currentSettings, cor_nop_certified: checked as boolean })
                  }
                />
                <label htmlFor="cor-nop" className="text-sm font-medium">COR-NOP Equivalent</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sni"
                  checked={currentSettings.sni_certified}
                  onCheckedChange={(checked) => 
                    setCurrentSettings({ ...currentSettings, sni_certified: checked as boolean })
                  }
                />
                <label htmlFor="sni" className="text-sm font-medium">SNI</label>
              </div>
            </div>

            <Button onClick={handleSaveSettings} className="w-full">
              Simpan Pengaturan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Fields Dialog */}
      <Dialog open={customFieldDialogOpen} onOpenChange={setCustomFieldDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Custom Fields - {selectedFarmer?.nama}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {getCustomFields().length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Belum ada custom field yang dikonfigurasi.</p>
                <p className="text-sm mt-2">
                  Silakan tambahkan custom field di{" "}
                  <Link to="/label-settings" className="text-primary hover:underline">
                    Kustomisasi Label
                  </Link>
                </p>
              </div>
            ) : (
              <>
                {getCustomFields().map((field: CustomField) => {
                  const error = fieldErrors[field.id];
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      
                      {field.type === 'text' && (
                        <Input
                          id={field.id}
                          value={customFieldValues[field.id] || ""}
                          onChange={(e) => {
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value,
                            });
                            // Clear error on change
                            if (fieldErrors[field.id]) {
                              setFieldErrors({ ...fieldErrors, [field.id]: '' });
                            }
                          }}
                          placeholder={`Masukkan ${field.label.toLowerCase()}`}
                          className={error ? "border-destructive" : ""}
                        />
                      )}
                      
                      {field.type === 'number' && (
                        <Input
                          id={field.id}
                          type="number"
                          value={customFieldValues[field.id] || ""}
                          onChange={(e) => {
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value,
                            });
                            if (fieldErrors[field.id]) {
                              setFieldErrors({ ...fieldErrors, [field.id]: '' });
                            }
                          }}
                          placeholder={`Masukkan ${field.label.toLowerCase()}`}
                          min={field.min}
                          max={field.max}
                          className={error ? "border-destructive" : ""}
                        />
                      )}
                      
                      {field.type === 'date' && (
                        <Input
                          id={field.id}
                          type="date"
                          value={customFieldValues[field.id] || ""}
                          onChange={(e) => {
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: e.target.value,
                            });
                            if (fieldErrors[field.id]) {
                              setFieldErrors({ ...fieldErrors, [field.id]: '' });
                            }
                          }}
                          className={error ? "border-destructive" : ""}
                        />
                      )}
                      
                      {field.type === 'dropdown' && field.options && (
                        <Select
                          value={customFieldValues[field.id] || ""}
                          onValueChange={(value) => {
                            setCustomFieldValues({
                              ...customFieldValues,
                              [field.id]: value,
                            });
                            if (fieldErrors[field.id]) {
                              setFieldErrors({ ...fieldErrors, [field.id]: '' });
                            }
                          }}
                        >
                          <SelectTrigger className={error ? "border-destructive" : ""}>
                            <SelectValue placeholder={`Pilih ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {error && (
                        <div className="flex items-center gap-1 text-destructive text-sm">
                          <AlertCircle className="h-3 w-3" />
                          <span>{error}</span>
                        </div>
                      )}
                      
                      {field.type === 'number' && (field.min !== undefined || field.max !== undefined) && !error && (
                        <p className="text-xs text-muted-foreground">
                          {field.min !== undefined && field.max !== undefined
                            ? `Nilai antara ${field.min} - ${field.max}`
                            : field.min !== undefined
                            ? `Minimal ${field.min}`
                            : `Maksimal ${field.max}`}
                        </p>
                      )}
                    </div>
                  );
                })}
                <Button onClick={handleSaveCustomFields} className="w-full">
                  Simpan Custom Fields
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Massal - {selectedFarmerIds.length} Petani</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>Status Produk</Label>
              <RadioGroup
                value={bulkSettings.is_organic ? "organic" : "conventional"}
                onValueChange={(value) => 
                  setBulkSettings({ ...bulkSettings, is_organic: value === "organic" })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="organic" id="bulk-organic" />
                  <label htmlFor="bulk-organic" className="text-sm font-medium cursor-pointer">Organik</label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="conventional" id="bulk-conventional" />
                  <label htmlFor="bulk-conventional" className="text-sm font-medium cursor-pointer">Konvensional</label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Sertifikasi</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bulk-eu"
                  checked={bulkSettings.eu_certified}
                  onCheckedChange={(checked) => 
                    setBulkSettings({ ...bulkSettings, eu_certified: checked as boolean })
                  }
                />
                <label htmlFor="bulk-eu" className="text-sm font-medium">EU</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bulk-cor-nop"
                  checked={bulkSettings.cor_nop_certified}
                  onCheckedChange={(checked) => 
                    setBulkSettings({ ...bulkSettings, cor_nop_certified: checked as boolean })
                  }
                />
                <label htmlFor="bulk-cor-nop" className="text-sm font-medium">COR-NOP Equivalent</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bulk-sni"
                  checked={bulkSettings.sni_certified}
                  onCheckedChange={(checked) => 
                    setBulkSettings({ ...bulkSettings, sni_certified: checked as boolean })
                  }
                />
                <label htmlFor="bulk-sni" className="text-sm font-medium">SNI</label>
              </div>
            </div>

            <Button onClick={handleSaveBulkSettings} className="w-full">
              Simpan untuk {selectedFarmerIds.length} Petani
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview & Print Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Label - {selectedFarmer?.nama}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div ref={printRef} className="flex justify-center">
              {selectedFarmer && (
                <PackagingLabel
                  farmerName={selectedFarmer.nama}
                  farmerCode={selectedFarmer.kode_petani}
                  farmerLogo={selectedFarmer.logo_url}
                  farmerId={selectedFarmer.id}
                  euCertified={currentSettings.eu_certified || false}
                  corNopCertified={currentSettings.cor_nop_certified || false}
                  sniCertified={currentSettings.sni_certified || false}
                  isOrganic={currentSettings.is_organic !== false}
                  companyName={profile?.nama_perusahaan}
                  customColors={profile?.label_primary_color ? {
                    primary: profile.label_primary_color,
                    backgroundStart: profile.label_background_start || "40 100% 97%",
                    backgroundEnd: profile.label_background_end || "33 100% 87%",
                  } : undefined}
                  customFont={profile?.label_font_family}
                  customLogo={profile?.logo_url}
                  qrSize={profile?.qr_size}
                  qrErrorCorrection={profile?.qr_error_correction as 'L' | 'M' | 'Q' | 'H'}
                  qrLogo={profile?.qr_logo_url}
                  qrLogoSize={profile?.qr_logo_size}
                  showForPrint={true}
                  templateElements={getTemplateElements()}
                  customData={selectedFarmer.custom_data as Record<string, string>}
                />
              )}
            </div>
            <Button onClick={handlePrint} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Cetak Label
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print Preview Dialog with Grid Layout */}
      <PrintPreviewDialog
        open={printPreviewOpen}
        onOpenChange={setPrintPreviewOpen}
        farmers={farmers
          .filter((f) => selectedFarmerIds.includes(f.id))
          .map((f) => {
            const settings = labelSettings.find((ls) => ls.petani_id === f.id);
            return {
              id: f.id,
              nama: f.nama,
              kode_petani: f.kode_petani,
              logo_url: f.logo_url,
              custom_data: f.custom_data as Record<string, string>,
              euCertified: settings?.eu_certified || false,
              corNopCertified: settings?.cor_nop_certified || false,
              sniCertified: settings?.sni_certified || false,
              isOrganic: settings?.is_organic !== false,
            };
          })}
        companyName={profile?.nama_perusahaan}
        customColors={profile?.label_primary_color ? {
          primary: profile.label_primary_color,
          backgroundStart: profile.label_background_start || "40 100% 97%",
          backgroundEnd: profile.label_background_end || "33 100% 87%",
        } : undefined}
        customFont={profile?.label_font_family}
        customLogo={profile?.logo_url}
        qrSize={profile?.qr_size}
        qrErrorCorrection={profile?.qr_error_correction as 'L' | 'M' | 'Q' | 'H'}
        qrLogo={profile?.qr_logo_url}
        qrLogoSize={profile?.qr_logo_size}
        templateElements={getTemplateElements()}
      />

      {/* Hidden Labels for Individual Download */}
      <div className="hidden">
        {farmers.map((farmer) => {
          const settings = labelSettings.find(s => s.petani_id === farmer.id);
          return (
            <div
              key={farmer.id}
              ref={(el) => (singleLabelRefs.current[farmer.id] = el)}
              className="w-[350px] h-[500px]"
            >
              <PackagingLabel
                farmerName={farmer.nama}
                farmerCode={farmer.kode_petani}
                farmerLogo={farmer.logo_url}
                farmerId={farmer.id}
                euCertified={settings?.eu_certified || false}
                corNopCertified={settings?.cor_nop_certified || false}
                sniCertified={settings?.sni_certified || false}
                isOrganic={settings?.is_organic !== false}
                companyName={profile?.nama_perusahaan}
                customColors={profile?.label_primary_color ? {
                  primary: profile.label_primary_color,
                  backgroundStart: profile.label_background_start || "40 100% 97%",
                  backgroundEnd: profile.label_background_end || "33 100% 87%",
                } : undefined}
                customFont={profile?.label_font_family}
                customLogo={profile?.logo_url}
                qrSize={profile?.qr_size}
                qrErrorCorrection={profile?.qr_error_correction as 'L' | 'M' | 'Q' | 'H'}
                qrLogo={profile?.qr_logo_url}
                qrLogoSize={profile?.qr_logo_size}
                showForPrint={true}
                templateElements={getTemplateElements()}
                customData={farmer.custom_data as Record<string, string>}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
