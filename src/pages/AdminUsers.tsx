import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ASSIGNABLE_ROLES, ROLE_LABELS, useUserRoles } from "@/hooks/use-user-role";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Plus, RefreshCw, Search, ShieldCheck, Trash2, KeyRound } from "lucide-react";
import { Link } from "react-router-dom";

interface ManagedUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
}

const AdminUsers = () => {
  const { toast } = useToast();
  const { isDeveloper, loading: rolesLoading } = useUserRoles();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoles, setNewRoles] = useState<string[]>([]);

  const [roleTarget, setRoleTarget] = useState<ManagedUser | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);

  const [pwTarget, setPwTarget] = useState<ManagedUser | null>(null);
  const [pwValue, setPwValue] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);

  const call = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("manage-users", { body: payload });
    if (error) {
      const details = (error as any)?.context ? await (error as any).context.text() : error.message;
      throw new Error(details || error.message);
    }
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await call({ action: "list" });
      setUsers(res.users || []);
    } catch (err) {
      toast({ title: "Gagal memuat pengguna", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!rolesLoading && isDeveloper) load();
    else if (!rolesLoading) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rolesLoading, isDeveloper]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? users.filter(
          (u) =>
            (u.email || "").toLowerCase().includes(q) ||
            (u.full_name || "").toLowerCase().includes(q) ||
            u.roles.some((r) => r.includes(q))
        )
      : users;
    return [...list].sort((a, b) => (a.email || "").localeCompare(b.email || "", undefined, { numeric: true }));
  }, [users, query]);

  const toggle = (list: string[], role: string, setter: (v: string[]) => void) =>
    setter(list.includes(role) ? list.filter((r) => r !== role) : [...list, role]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      await call({
        action: "create",
        email: newEmail,
        password: newPassword,
        full_name: newName,
        roles: newRoles,
      });
      toast({ title: "Akun dibuat", description: newEmail });
      setCreateOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRoles([]);
      await load();
    } catch (err) {
      toast({ title: "Gagal", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveRoles = async () => {
    if (!roleTarget) return;
    setBusy(true);
    try {
      await call({ action: "set_roles", user_id: roleTarget.user_id, roles: editRoles });
      toast({ title: "Peran diperbarui", description: roleTarget.email || "" });
      setRoleTarget(null);
      await load();
    } catch (err) {
      toast({ title: "Gagal", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!pwTarget) return;
    setBusy(true);
    try {
      await call({ action: "reset_password", user_id: pwTarget.user_id, password: pwValue });
      toast({ title: "Password direset", description: pwTarget.email || "" });
      setPwTarget(null);
      setPwValue("");
    } catch (err) {
      toast({ title: "Gagal", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await call({ action: "delete", user_id: deleteTarget.user_id });
      toast({ title: "Akun dihapus permanen", description: deleteTarget.email || "" });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast({ title: "Gagal", description: String((err as Error).message), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-natural p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button variant="ghost" asChild className="-ml-3 mb-1">
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" /> Pengaturan Pengguna
            </h1>
            <p className="text-sm text-muted-foreground">
              Khusus Developer — kelola akun, peran, dan akses aplikasi.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Muat ulang
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Akun Baru
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daftar Pengguna ({filtered.length})</CardTitle>
            <CardDescription>Developer memiliki akses penuh ke seluruh sistem.</CardDescription>
            <div className="relative pt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari email, nama, atau peran..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada pengguna.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Peran</TableHead>
                      <TableHead>Login Terakhir</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium">
                          {u.email}
                          <div className="text-xs text-muted-foreground">via {u.provider}</div>
                        </TableCell>
                        <TableCell>{u.full_name || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.length === 0 ? (
                              <Badge variant="outline">Tanpa akses</Badge>
                            ) : (
                              u.roles.map((r) => (
                                <Badge key={r} variant={r === "developer" ? "default" : "secondary"}>
                                  {ROLE_LABELS[r] || r}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("id-ID") : "-"}
                        </TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRoleTarget(u);
                              setEditRoles(u.roles);
                            }}
                          >
                            Peran
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setPwTarget(u)}>
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(u)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Akun Baru</DialogTitle>
            <DialogDescription>Akun langsung aktif tanpa verifikasi email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} type="email" />
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password (min 8 karakter)</Label>
              <Input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="text" />
            </div>
            <div className="space-y-2">
              <Label>Peran</Label>
              <div className="grid grid-cols-2 gap-2">
                {ASSIGNABLE_ROLES.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={newRoles.includes(r)}
                      onCheckedChange={() => toggle(newRoles, r, setNewRoles)}
                    />
                    {ROLE_LABELS[r]}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Buat Akun
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roles */}
      <Dialog open={!!roleTarget} onOpenChange={(o) => !o && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Peran</DialogTitle>
            <DialogDescription>{roleTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {ASSIGNABLE_ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={editRoles.includes(r)}
                  onCheckedChange={() => toggle(editRoles, r, setEditRoles)}
                />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveRoles} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password */}
      <Dialog open={!!pwTarget} onOpenChange={(o) => !o && setPwTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>{pwTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Password baru (min 8 karakter)</Label>
            <Input value={pwValue} onChange={(e) => setPwValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwTarget(null)}>
              Batal
            </Button>
            <Button onClick={handleResetPassword} disabled={busy}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong>{deleteTarget?.email}</strong> beserta seluruh perannya akan dihapus dan
              tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
