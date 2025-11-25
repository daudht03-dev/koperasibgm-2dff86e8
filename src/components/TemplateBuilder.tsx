import { useState, useEffect, useMemo } from "react";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Eye, Save, RotateCcw, Upload } from "lucide-react";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { toast } from "@/hooks/use-toast";

export interface TemplateElement {
  id: string;
  type: "company_logo" | "company_name" | "farmer_name" | "farmer_logo" | "certifications" | "qr_code" | "organic_badge" | "custom_field";
  label: string;
  enabled: boolean;
  customFieldId?: string; // For custom_field type
  styles?: {
    marginTop?: number;
    marginBottom?: number;
    paddingX?: number;
    paddingY?: number;
    fontSize?: number;
  };
}

const DEFAULT_ELEMENTS: TemplateElement[] = [
  { id: "company_logo", type: "company_logo", label: "Logo Perusahaan", enabled: true, styles: { marginTop: 0, marginBottom: 4, paddingX: 0, paddingY: 0, fontSize: 16 } },
  { id: "company_name", type: "company_name", label: "Nama Perusahaan", enabled: true, styles: { marginTop: 0, marginBottom: 4, paddingX: 0, paddingY: 0, fontSize: 30 } },
  { id: "farmer_logo", type: "farmer_logo", label: "Logo Petani", enabled: false, styles: { marginTop: 0, marginBottom: 4, paddingX: 0, paddingY: 0, fontSize: 16 } },
  { id: "farmer_name", type: "farmer_name", label: "Nama Petani", enabled: true, styles: { marginTop: 0, marginBottom: 4, paddingX: 0, paddingY: 0, fontSize: 24 } },
  { id: "certifications", type: "certifications", label: "Sertifikasi", enabled: true, styles: { marginTop: 0, marginBottom: 4, paddingX: 4, paddingY: 4, fontSize: 12 } },
  { id: "qr_code", type: "qr_code", label: "QR Code", enabled: true, styles: { marginTop: 0, marginBottom: 4, paddingX: 3, paddingY: 3, fontSize: 14 } },
  { id: "organic_badge", type: "organic_badge", label: "Badge Organik/Konvensional", enabled: true, styles: { marginTop: 0, marginBottom: 0, paddingX: 0, paddingY: 3, fontSize: 20 } },
];

interface SortableItemProps {
  element: TemplateElement;
  onToggle: (id: string) => void;
  onStyleChange: (id: string, styles: TemplateElement['styles']) => void;
}

function SortableItem({ element, onToggle, onStyleChange }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [showStyles, setShowStyles] = useState(false);

  const handleStyleChange = (property: keyof NonNullable<TemplateElement['styles']>, value: number) => {
    onStyleChange(element.id, {
      ...element.styles,
      [property]: value,
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-lg ${!element.enabled ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3 p-4">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <span className="font-medium">{element.label}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowStyles(!showStyles)}
        >
          <span className="text-xs">Style</span>
        </Button>
        <Button
          variant={element.enabled ? "default" : "outline"}
          size="sm"
          onClick={() => onToggle(element.id)}
        >
          {element.enabled ? "Aktif" : "Nonaktif"}
        </Button>
      </div>
      
      {showStyles && element.enabled && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Margin Top (px)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={element.styles?.marginTop || 0}
                onChange={(e) => handleStyleChange('marginTop', parseInt(e.target.value) || 0)}
                className="w-full mt-1 px-2 py-1 text-sm border rounded"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Margin Bottom (px)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={element.styles?.marginBottom || 0}
                onChange={(e) => handleStyleChange('marginBottom', parseInt(e.target.value) || 0)}
                className="w-full mt-1 px-2 py-1 text-sm border rounded"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Padding X (px)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={element.styles?.paddingX || 0}
                onChange={(e) => handleStyleChange('paddingX', parseInt(e.target.value) || 0)}
                className="w-full mt-1 px-2 py-1 text-sm border rounded"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Padding Y (px)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={element.styles?.paddingY || 0}
                onChange={(e) => handleStyleChange('paddingY', parseInt(e.target.value) || 0)}
                className="w-full mt-1 px-2 py-1 text-sm border rounded"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground">Font Size (px)</label>
              <input
                type="number"
                min="8"
                max="100"
                value={element.styles?.fontSize || 16}
                onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value) || 16)}
                className="w-full mt-1 px-2 py-1 text-sm border rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TemplateBuilderProps {
  onElementsChange?: (elements: TemplateElement[]) => void;
}

export const TemplateBuilder = ({ onElementsChange }: TemplateBuilderProps) => {
  const { profile, updateProfile } = useCompanyProfile();
  
  // Get custom fields from profile
  const customFields = useMemo(() => {
    if (profile?.custom_fields && Array.isArray(profile.custom_fields)) {
      return profile.custom_fields.filter((f: any) => f.enabled);
    }
    return [];
  }, [profile?.custom_fields]);

  const [elements, setElements] = useState<TemplateElement[]>(() => {
    if (profile?.template_settings) {
      const saved = profile.template_settings as { elements?: TemplateElement[] };
      return saved.elements || DEFAULT_ELEMENTS;
    }
    return DEFAULT_ELEMENTS;
  });

  // Update elements when custom fields change
  useEffect(() => {
    setElements(prevElements => {
      // Remove old custom field elements
      const withoutCustomFields = prevElements.filter(e => e.type !== 'custom_field');
      
      // Add new custom field elements
      const customFieldElements: TemplateElement[] = customFields.map((field: any) => ({
        id: `custom_${field.id}`,
        type: 'custom_field',
        label: field.label,
        customFieldId: field.id,
        enabled: true,
        styles: { marginTop: 0, marginBottom: 2, paddingX: 0, paddingY: 0, fontSize: 14 }
      }));
      
      return [...withoutCustomFields, ...customFieldElements];
    });
  }, [customFields]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Sync initial elements to parent on mount and when profile changes
  useEffect(() => {
    onElementsChange?.(elements);
  }, []);

  // Update elements when profile template settings change
  useEffect(() => {
    if (profile?.template_settings) {
      const saved = profile.template_settings as { elements?: TemplateElement[] };
      const newElements = saved.elements || DEFAULT_ELEMENTS;
      setElements(newElements);
      onElementsChange?.(newElements);
    }
  }, [profile?.template_settings]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setElements((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        onElementsChange?.(newItems);
        return newItems;
      });
    }
  };

  const handleToggleElement = (id: string) => {
    setElements((items) => {
      const newItems = items.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      );
      onElementsChange?.(newItems);
      return newItems;
    });
  };

  const handleStyleChange = (id: string, styles: TemplateElement['styles']) => {
    setElements((items) => {
      const newItems = items.map((item) =>
        item.id === id ? { ...item, styles } : item
      );
      onElementsChange?.(newItems);
      return newItems;
    });
  };

  const handleSaveTemplate = async () => {
    try {
      await updateProfile({
        template_settings: { elements },
      });
      toast({
        title: "Berhasil",
        description: "Template kustom berhasil disimpan",
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Error",
        description: "Gagal menyimpan template",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    setElements(DEFAULT_ELEMENTS);
    onElementsChange?.(DEFAULT_ELEMENTS);
    toast({
      title: "Template direset",
      description: "Template dikembalikan ke pengaturan default",
    });
  };

  const handleExport = () => {
    const templateData = {
      version: "1.0",
      elements,
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(templateData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `label-template-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Template diekspor",
      description: "File JSON berhasil diunduh",
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const templateData = JSON.parse(content);
        
        if (!templateData.elements || !Array.isArray(templateData.elements)) {
          throw new Error("Format template tidak valid");
        }
        
        setElements(templateData.elements);
        onElementsChange?.(templateData.elements);
        
        toast({
          title: "Template diimpor",
          description: "Template berhasil dimuat dari file",
        });
      } catch (error) {
        console.error("Error importing template:", error);
        toast({
          title: "Error",
          description: "Gagal memuat template. Pastikan file JSON valid.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Template Builder</CardTitle>
            <CardDescription>
              Atur urutan dan aktifkan/nonaktifkan elemen label dengan drag-and-drop
            </CardDescription>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Custom Template
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>💡 <strong>Tips:</strong> Seret elemen untuk mengubah urutan tampilan pada label. Klik "Style" untuk mengatur spacing, padding, dan ukuran font. Klik "Export/Import JSON" untuk backup atau sharing template.</p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={elements.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {elements.map((element) => (
                <SortableItem
                  key={element.id}
                  element={element}
                  onToggle={handleToggleElement}
                  onStyleChange={handleStyleChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="space-y-2 pt-4">
          <div className="flex gap-2">
            <Button onClick={handleSaveTemplate} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Simpan Template
            </Button>
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="secondary" className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Export JSON
            </Button>
            <Button variant="secondary" className="flex-1" asChild>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <span className="flex items-center justify-center">
                  <Upload className="h-4 w-4 mr-2" />
                  Import JSON
                </span>
              </label>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
