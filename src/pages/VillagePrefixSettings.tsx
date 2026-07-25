import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save, Pencil, X, MapPin, Loader2 } from "lucide-react";
import { useVillagePrefixes, VillagePrefix } from "@/hooks/use-village-prefixes";

const sanitizeCode = (raw: string) =>
  raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10);

const VillagePrefixSettings = () => {
  const navigate = useNavigate();
  const { prefixes, loading, addPrefix, updatePrefix, deletePrefix, validatePrefixInput } = useVillagePrefixes();

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");

  const newError = newCode || newName ? validatePrefixInput(newCode, newName) : null;
  const editError =
    editingId && (editCode || editName)
      ? validatePrefixInput(editCode, editName, editingId)
      : null;

  const handleAdd = async () => {
    if (!newCode.trim() || !newName.trim() || newError) return;
    setSaving(true);
    const ok = await addPrefix(newCode, newName);
    setSaving(false);
    if (ok) {
      setNewCode("");
      setNewName("");
    }
  };

  const startEdit = (p: VillagePrefix) => {
    setEditingId(p.id);
    setEditCode(p.code);
    setEditName(p.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCode("");
    setEditName("");
  };

  const handleSaveEdit = async (id: string) => {
    if (editError) return;
    const ok = await updatePrefix(id, editCode, editName);
    if (ok) cancelEdit();
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Hapus mapping "${label}"?`)) return;
    await deletePrefix(id);
  };

  return (
    <div className="min-h-screen bg-gradient-natural p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              Mapping Kode Desa
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola prefix kode lahan → nama desa. Digunakan di peta, ekspor, dan tampilan lahan.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tambah Mapping Baru</CardTitle>
            <CardDescription>
              Contoh: kode <Badge variant="secondary" className="mx-1 font-mono">MT</Badge> untuk desa Metenggeng.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-3 items-end">
              <div>
                <Label htmlFor="new-code">Kode Prefix</Label>
                <Input
                  id="new-code"
                  placeholder="MT"
                  value={newCode}
                  onChange={(e) => setNewCode(sanitizeCode(e.target.value))}
                  maxLength={10}
                  className="font-mono uppercase"
                />
              </div>
              <div>
                <Label htmlFor="new-name">Nama Desa</Label>
                <Input
                  id="new-name"
                  placeholder="Metenggeng"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={saving || !newCode.trim() || !newName.trim() || !!newError}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Tambah
              </Button>
            </div>
            {newError && (
              <p className="text-xs text-destructive">{newError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Format: hanya huruf besar/angka, tanpa spasi/simbol, 1–10 karakter. Kode harus unik.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daftar Mapping ({prefixes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Memuat...
              </div>
            ) : prefixes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Belum ada mapping. Tambahkan mapping pertama di atas.
              </p>
            ) : (
              <div className="divide-y">
                {prefixes.map((p) => (
                  <div key={p.id} className="py-3 flex items-center gap-3">
                    {editingId === p.id ? (
                      <>
                        <Input
                          value={editCode}
                          onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                          className="w-28 font-mono uppercase"
                          maxLength={10}
                        />
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                          maxLength={100}
                        />
                        <Button size="sm" onClick={() => handleSaveEdit(p.id)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEdit}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary" className="font-mono w-20 justify-center">
                          {p.code}
                        </Badge>
                        <span className="flex-1 font-medium">{p.name}</span>
                        <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(p.id, `${p.code} → ${p.name}`)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VillagePrefixSettings;
