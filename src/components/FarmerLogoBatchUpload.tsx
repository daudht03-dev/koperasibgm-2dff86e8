import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFarmers } from "@/hooks/use-farmers";

interface UploadResult {
  farmerCode: string;
  status: 'success' | 'error';
  message: string;
}

export const FarmerLogoBatchUpload = () => {
  const { farmers, refetch } = useFarmers();
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const template = farmers.map(f => `${f.kode_petani},`).join('\n');
    const header = 'kode_petani,logo_filename\n';
    const csv = header + template;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'farmer-logos-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template CSV berhasil diunduh",
      description: "Isi file dengan nama logo untuk setiap petani",
    });
  };

  // Function to crop and resize image to square
  const cropAndResizeImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const targetSize = 400; // Standard size for logos
        
        canvas.width = targetSize;
        canvas.height = targetSize;

        if (ctx) {
          // Calculate crop position (center crop)
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          
          ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/png', 0.95);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const csvFile = Array.from(files).find(f => f.name.endsWith('.csv'));
    const logoFiles = Array.from(files).filter(f => !f.name.endsWith('.csv'));

    if (!csvFile) {
      toast({
        title: "Error",
        description: "File CSV tidak ditemukan",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const uploadResults: UploadResult[] = [];

    try {
      // Read CSV
      const csvText = await csvFile.text();
      const lines = csvText.split('\n').slice(1); // Skip header
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        const [farmerCode, logoFilename] = line.split(',').map(s => s.trim());
        if (!farmerCode || !logoFilename) continue;

        // Find farmer
        const farmer = farmers.find(f => f.kode_petani === farmerCode);
        if (!farmer) {
          uploadResults.push({
            farmerCode,
            status: 'error',
            message: 'Petani tidak ditemukan',
          });
          continue;
        }

        // Find logo file
        const logoFile = logoFiles.find(f => f.name === logoFilename);
        if (!logoFile) {
          uploadResults.push({
            farmerCode,
            status: 'error',
            message: `Logo file ${logoFilename} tidak ditemukan`,
          });
          continue;
        }

        // Validate file type
        if (!logoFile.type.startsWith('image/')) {
          uploadResults.push({
            farmerCode,
            status: 'error',
            message: `${logoFilename} bukan file gambar yang valid`,
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (logoFile.size > 5 * 1024 * 1024) {
          uploadResults.push({
            farmerCode,
            status: 'error',
            message: `${logoFilename} melebihi batas 5MB`,
          });
          continue;
        }

        try {
          // Crop and resize image
          const croppedBlob = await cropAndResizeImage(logoFile);
          const filePath = `${farmerCode}_${Date.now()}_${logoFile.name}`;

          const { error: uploadError } = await supabase.storage
            .from('farmer-logos')
            .upload(filePath, croppedBlob, {
              cacheControl: '3600',
              upsert: true,
              contentType: 'image/png',
            });

          if (uploadError) {
            uploadResults.push({
              farmerCode,
              status: 'error',
              message: uploadError.message,
            });
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('farmer-logos')
            .getPublicUrl(filePath);

          // Update farmer record
          const { error: updateError } = await supabase
            .from('petani')
            .update({ logo_url: publicUrl })
            .eq('id', farmer.id);

          if (updateError) {
            uploadResults.push({
              farmerCode,
              status: 'error',
              message: updateError.message,
            });
          } else {
            uploadResults.push({
              farmerCode,
              status: 'success',
              message: 'Logo berhasil diupload (400x400px)',
            });
          }
        } catch (error) {
          uploadResults.push({
            farmerCode,
            status: 'error',
            message: `Gagal memproses gambar: ${error}`,
          });
          continue;
        }
      }

      setResults(uploadResults);
      await refetch();
      
      const successCount = uploadResults.filter(r => r.status === 'success').length;
      toast({
        title: "Batch upload selesai",
        description: `${successCount} dari ${uploadResults.length} logo berhasil diupload`,
      });
    } catch (error) {
      console.error("Error batch upload:", error);
      toast({
        title: "Error",
        description: "Gagal melakukan batch upload",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Upload Logo Petani</CardTitle>
        <CardDescription>
          Upload logo untuk banyak petani sekaligus menggunakan CSV dan file gambar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <Label>Langkah 1: Download Template CSV</Label>
            <Button onClick={downloadTemplate} variant="outline" className="w-full mt-2">
              <Download className="h-4 w-4 mr-2" />
              Download Template CSV
            </Button>
          </div>

          <div>
            <Label>Langkah 2: Upload CSV + Logo Files</Label>
            <Input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,image/*"
              onChange={handleFileUpload}
              disabled={uploading}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Pilih file CSV dan semua file logo sekaligus (Ctrl/Cmd + klik). Logo akan otomatis di-crop ke 400x400px (max 5MB)
            </p>
          </div>
        </div>

        {uploading && (
          <div className="text-center py-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Mengupload logo...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto">
            <h4 className="font-medium text-sm mb-2">Hasil Upload:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                {result.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="font-medium">{result.farmerCode}:</span>
                <span className={result.status === 'success' ? 'text-green-600' : 'text-destructive'}>
                  {result.message}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">📝 Format CSV:</p>
          <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
kode_petani,logo_filename{'\n'}
P001,logo-petani-001.png{'\n'}
P002,logo-petani-002.jpg
          </pre>
          <p className="text-muted-foreground mt-2">
            Pastikan nama file logo di CSV sesuai dengan nama file yang diupload
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
