import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save } from "lucide-react";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { toast } from "@/hooks/use-toast";

export type FieldType = 'text' | 'number' | 'date' | 'dropdown';

export interface CustomField {
  id: string;
  label: string;
  enabled: boolean;
  type: FieldType;
  defaultValue?: string;
  required?: boolean;
  options?: string[]; // For dropdown type
  min?: number; // For number type
  max?: number; // For number type
}

export const CustomFieldsManager = () => {
  const { profile, updateProfile } = useCompanyProfile();
  const [fields, setFields] = useState<CustomField[]>(() => {
    if (profile?.custom_fields && Array.isArray(profile.custom_fields)) {
      // Migrate old fields to new structure with defaults
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
    }
    return [];
  });

  const addField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      label: "Field Baru",
      enabled: true,
      type: 'text',
      defaultValue: "",
      required: false,
    };
    setFields([...fields, newField]);
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const saveFields = async () => {
    try {
      await updateProfile({
        custom_fields: fields,
      });
      toast({
        title: "Berhasil",
        description: "Custom fields berhasil disimpan",
      });
    } catch (error) {
      console.error("Error saving custom fields:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan custom fields",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Fields untuk Label</CardTitle>
        <CardDescription>
          Tambahkan field custom seperti berat, tanggal packing, dll yang bisa ditampilkan di label
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {fields.map((field) => (
            <div key={field.id} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <Switch
                  checked={field.enabled}
                  onCheckedChange={(enabled) => updateField(field.id, { enabled })}
                />
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Label Field</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                      placeholder="Contoh: Berat"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tipe Field</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value: FieldType) => updateField(field.id, { type: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Teks</SelectItem>
                        <SelectItem value="number">Angka</SelectItem>
                        <SelectItem value="date">Tanggal</SelectItem>
                        <SelectItem value="dropdown">Dropdown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Nilai Default</Label>
                    <Input
                      value={field.defaultValue || ""}
                      onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                      placeholder="Opsional"
                      className="mt-1"
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeField(field.id)}
                  className="self-start"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pl-12">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.required || false}
                    onCheckedChange={(required) => updateField(field.id, { required })}
                  />
                  <Label className="text-xs">Wajib diisi</Label>
                </div>
                
                {field.type === 'number' && (
                  <>
                    <div>
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        value={field.min || ""}
                        onChange={(e) => updateField(field.id, { min: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Nilai minimum"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max</Label>
                      <Input
                        type="number"
                        value={field.max || ""}
                        onChange={(e) => updateField(field.id, { max: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="Nilai maksimum"
                        className="mt-1"
                      />
                    </div>
                  </>
                )}
                
                {field.type === 'dropdown' && (
                  <div className="col-span-2">
                    <Label className="text-xs">Opsi Dropdown (pisahkan dengan koma)</Label>
                    <Input
                      value={field.options?.join(', ') || ""}
                      onChange={(e) => updateField(field.id, { 
                        options: e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt)
                      })}
                      placeholder="Contoh: Kecil, Sedang, Besar"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {fields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada custom field. Klik tombol di bawah untuk menambahkan.
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={addField} variant="outline" className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Tambah Field
          </Button>
          <Button onClick={saveFields} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Simpan Custom Fields
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 text-sm">
          <p className="font-medium mb-1">💡 Cara Penggunaan:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Tambah field dan pilih tipe (teks, angka, tanggal, atau dropdown)</li>
            <li>Atur validasi: wajib diisi, min/max untuk angka, opsi untuk dropdown</li>
            <li>Di halaman Label Management, Anda bisa mengatur nilai per petani dengan validasi otomatis</li>
            <li>Custom field akan muncul sebagai elemen di Template Builder</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
