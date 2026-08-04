import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, RotateCw, Trash2, Key, ArrowLeft, ShieldCheck, ExternalLink, Search, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Auditor {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
}
interface LogEntry {
  id: string;
  user_id: string | null;
  email: string | null;
  path: string;
  event: string;
  ip: string | null;
  user_agent: string | null;
  accessed_at: string;
}

const AdminAuditors = () => {
  const [auditors, setAuditors] = useState<Auditor[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const [resetTarget, setResetTarget] = useState<Auditor | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Auditor | null>(null);

  const [logSearch, setLogSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59`) : null;
    return logs.filter((l) => {
      const at = new Date(l.accessed_at);
      if (from && at < from) return false;
      if (to && at > to) return false;
      if (!q) return true;
      return [l.email, l.user_id, l.path, l.event, l.ip].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [logs, logSearch, dateFrom, dateTo]);

  const exportLogsCSV = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Waktu", "Email", "User ID", "Event", "Halaman", "IP", "User Agent"],
      ...filteredLogs.map((l) => [
        new Date(l.accessed_at).toLocaleString("id-ID"),
        l.email ?? "",
        l.user_id ?? "",
        l.event,
        l.path,
        l.ip ?? "",
        l.user_agent ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `log-auditor-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };


  const fetchAuditors = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-auditors", { body: { action: "list" } });
    setLoading(false);
    if (error) {
      toast({ title: "Gagal memuat auditor", description: error.message, variant: "destructive" });
      return;
    }
    setAuditors((data as any)?.auditors ?? []);
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    const { data, error } = await supabase.functions.invoke("manage-auditors", { body: { action: "list_logs", limit: 500 } });
    setLoadingLogs(false);
    if (error) {
      toast({ title: "Gagal memuat log", description: error.message, variant: "destructive" });
      return;
    }
    setLogs((data as any)?.logs ?? []);
  };

  useEffect(() => {
    fetchAuditors();
    fetchLogs();
  }, []);

  const handleCreate = async () => {
    if (!email || password.length < 8) {
      toast({ title: "Data tidak lengkap", description: "Password minimal 8 karakter", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("manage-auditors", {
      body: { action: "create", email: email.trim().toLowerCase(), password },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast({ title: "Gagal membuat auditor", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Auditor dibuat", description: `Akun ${email} siap digunakan` });
    setCreateOpen(false);
    setEmail("");
    setPassword("");
    fetchAuditors();
  };

  const handleReset = async () => {
    if (!resetTarget || newPassword.length < 8) return;
    setResetting(true);
    const { data, error } = await supabase.functions.invoke("manage-auditors", {
      body: { action: "reset_password", user_id: resetTarget.user_id, password: newPassword },
    });
    setResetting(false);
    if (error || (data as any)?.error) {
      toast({ title: "Gagal reset password", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Password direset" });
    setResetTarget(null);
    setNewPassword("");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.functions.invoke("manage-auditors", {
      body: { action: "delete", user_id: deleteTarget.user_id },
    });
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Auditor dihapus" });
    setDeleteTarget(null);
    fetchAuditors();
  };

  return (
    <div className="min-h-screen bg-gradient-natural p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" />Kembali</Link>
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2 mt-2">
              <ShieldCheck className="h-6 w-6 text-blue-600" /> Kelola Auditor
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola akun akses portal peta auditor eksternal & riwayat akses.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/auditor/map" target="_blank" rel="noreferrer">
                Buka Portal <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Tambah Auditor
            </Button>
          </div>
        </div>

        <Tabs defaultValue="auditors">
          <TabsList>
            <TabsTrigger value="auditors">Auditor ({auditors.length})</TabsTrigger>
            <TabsTrigger value="logs" onClick={() => fetchLogs()}>Riwayat Akses ({logs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="auditors">
            <Card>
              <CardHeader>
                <CardTitle>Daftar Auditor</CardTitle>
                <CardDescription>Auditor hanya dapat mengakses halaman peta audit.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : auditors.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Belum ada auditor</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Dibuat</TableHead>
                        <TableHead>Login Terakhir</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditors.map((a) => (
                        <TableRow key={a.user_id}>
                          <TableCell className="font-medium">{a.email}</TableCell>
                          <TableCell>{new Date(a.created_at).toLocaleDateString("id-ID")}</TableCell>
                          <TableCell>
                            {a.last_sign_in_at ? new Date(a.last_sign_in_at).toLocaleString("id-ID") : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => { setResetTarget(a); setNewPassword(""); }}>
                              <Key className="h-3.5 w-3.5 mr-1" /> Reset Password
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(a)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Riwayat Akses</CardTitle>
                    <CardDescription>
                      {filteredLogs.length} dari {logs.length} aktivitas terakhir
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={exportLogsCSV} disabled={filteredLogs.length === 0}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" /> Export CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loadingLogs}>
                      <RotateCw className={`h-4 w-4 mr-2 ${loadingLogs ? "animate-spin" : ""}`} /> Muat Ulang
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-3">
                  <div className="relative md:col-span-2">
                    <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      placeholder="Cari email auditor, kode petani/lahan, atau halaman..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Dari tanggal</Label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Sampai tanggal</Label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>
                {(logSearch || dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit"
                    onClick={() => { setLogSearch(""); setDateFrom(""); setDateTo(""); }}
                  >
                    Bersihkan filter
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {filteredLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {logs.length === 0 ? "Belum ada aktivitas" : "Tidak ada aktivitas yang cocok dengan filter"}
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Waktu</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Halaman</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs">{new Date(l.accessed_at).toLocaleString("id-ID")}</TableCell>
                          <TableCell className="text-xs">{l.email || l.user_id}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{l.event}</Badge></TableCell>
                          <TableCell className="text-xs font-mono">{l.path}</TableCell>
                          <TableCell className="text-xs">{l.ip || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Auditor</DialogTitle>
            <DialogDescription>Email & password akan diberikan ke auditor. Bagikan lewat kanal aman.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="auditor@lembaga.com" />
            </div>
            <div className="space-y-1">
              <Label>Password (min 8 karakter)</Label>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Batal</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Buat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>{resetTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label>Password baru (min 8 karakter)</Label>
            <Input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)}>Batal</Button>
            <Button onClick={handleReset} disabled={resetting || newPassword.length < 8}>
              {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Auditor?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <strong>{deleteTarget?.email}</strong> akan dihapus permanen. Log akses tetap tersimpan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminAuditors;
