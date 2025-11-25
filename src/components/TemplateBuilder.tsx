import { useState } from "react";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Eye, Save, RotateCcw } from "lucide-react";
import { useCompanyProfile } from "@/hooks/use-company-profile";
import { toast } from "@/hooks/use-toast";

interface TemplateElement {
  id: string;
  type: "company_logo" | "company_name" | "farmer_name" | "certifications" | "qr_code" | "organic_badge";
  label: string;
  enabled: boolean;
}

const DEFAULT_ELEMENTS: TemplateElement[] = [
  { id: "company_logo", type: "company_logo", label: "Logo Perusahaan", enabled: true },
  { id: "company_name", type: "company_name", label: "Nama Perusahaan", enabled: true },
  { id: "farmer_name", type: "farmer_name", label: "Nama Petani", enabled: true },
  { id: "certifications", type: "certifications", label: "Sertifikasi", enabled: true },
  { id: "qr_code", type: "qr_code", label: "QR Code", enabled: true },
  { id: "organic_badge", type: "organic_badge", label: "Badge Organik/Konvensional", enabled: true },
];

interface SortableItemProps {
  element: TemplateElement;
  onToggle: (id: string) => void;
}

function SortableItem({ element, onToggle }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-card border rounded-lg ${
        !element.enabled ? "opacity-50" : ""
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <span className="font-medium">{element.label}</span>
      </div>
      <Button
        variant={element.enabled ? "default" : "outline"}
        size="sm"
        onClick={() => onToggle(element.id)}
      >
        {element.enabled ? "Aktif" : "Nonaktif"}
      </Button>
    </div>
  );
}

export const TemplateBuilder = () => {
  const { profile, updateProfile } = useCompanyProfile();
  const [elements, setElements] = useState<TemplateElement[]>(() => {
    if (profile?.template_settings) {
      const saved = profile.template_settings as { elements?: TemplateElement[] };
      return saved.elements || DEFAULT_ELEMENTS;
    }
    return DEFAULT_ELEMENTS;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setElements((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleElement = (id: string) => {
    setElements((items) =>
      items.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
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
    toast({
      title: "Template direset",
      description: "Template dikembalikan ke pengaturan default",
    });
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
          <p>💡 <strong>Tips:</strong> Seret elemen untuk mengubah urutan tampilan pada label. Klik tombol untuk mengaktifkan/menonaktifkan elemen.</p>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={elements.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {elements.map((element) => (
                <SortableItem
                  key={element.id}
                  element={element}
                  onToggle={handleToggleElement}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSaveTemplate} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Simpan Template
          </Button>
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
