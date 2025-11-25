import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Save } from "lucide-react";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { toast } from "@/hooks/use-toast";

export interface CustomField {
  id: string;
  label: string;
  enabled: boolean;
  defaultValue?: string;
}

export const CustomFieldsManager = () => {
  const { profile, updateProfile } = useCompanyProfile();
  const [fields, setFields] = useState<CustomField[]>(() => {
    if (profile?.custom_fields && Array.isArray(profile.custom_fields)) {
      return profile.custom_fields as CustomField[];
    }
    return [];
  });

  const addField = () => {
    const newField: CustomField = {
      id: `field_${Date.now()}`,
      label: "Field Baru",
      enabled: true,
      defaultValue: "",
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
            <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <Switch
                checked={field.enabled}
                onCheckedChange={(enabled) => updateField(field.id, { enabled })}
              />
              <div className="flex-1 grid grid-cols-2 gap-3">
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
                  <Label className="text-xs">Nilai Default (Opsional)</Label>
                  <Input
                    value={field.defaultValue || ""}
                    onChange={(e) => updateField(field.id, { defaultValue: e.target.value })}
                    placeholder="Contoh: 1 kg"
                    className="mt-1"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeField(field.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
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
            <li>Tambah field yang ingin ditampilkan di label (berat, tanggal, dll)</li>
            <li>Atur nilai default jika diperlukan</li>
            <li>Di halaman Label Management, Anda bisa mengatur nilai per petani</li>
            <li>Custom field akan muncul sebagai elemen di Template Builder</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
