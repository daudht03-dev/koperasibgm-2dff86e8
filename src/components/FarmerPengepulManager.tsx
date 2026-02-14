import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Users, UserCheck, AlertTriangle, Search, Link2, Loader2 } from "lucide-react";
import { useFarmers } from "@/hooks/use-farmers";
import { usePengepul } from "@/hooks/use-pengepul";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const FarmerPengepulManager = () => {
  const { farmers, refetch: refetchFarmers } = useFarmers();
  const { pengepulList, loading: pengepulLoading } = usePengepul();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFarmers, setSelectedFarmers] = useState<Set<string>>(new Set());
  const [targetPengepul, setTargetPengepul] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "assigned" | "unassigned">("all");
  const [isAssigning, setIsAssigning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Get farmers without pengepul
  const farmersWithoutPengepul = useMemo(() => {
    return farmers.filter(f => !f.pengepul_id);
  }, [farmers]);

  // Get farmers with pengepul
  const farmersWithPengepul = useMemo(() => {
    return farmers.filter(f => f.pengepul_id);
  }, [farmers]);

  // Filter farmers based on search and status
  const filteredFarmers = useMemo(() => {
    let filtered = farmers;

    // Filter by status
    if (filterStatus === "assigned") {
      filtered = farmersWithPengepul;
    } else if (filterStatus === "unassigned") {
      filtered = farmersWithoutPengepul;
    }

    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f => 
        f.nama.toLowerCase().includes(term) ||
        f.kode_petani.toLowerCase().includes(term)
      );
    }

    return filtered.sort((a, b) => {
      // Sort unassigned first, then by kode_petani (natural sort)
      if (!a.pengepul_id && b.pengepul_id) return -1;
      if (a.pengepul_id && !b.pengepul_id) return 1;
      return a.kode_petani.localeCompare(b.kode_petani, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [farmers, farmersWithPengepul, farmersWithoutPengepul, filterStatus, searchTerm]);

  // Get pengepul name for a farmer
  const getPengepulName = (pengepulId: string | null) => {
    if (!pengepulId) return null;
    const pengepul = pengepulList.find(p => p.id === pengepulId);
    return pengepul?.nama || "Unknown";
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedFarmers.size === filteredFarmers.length) {
      setSelectedFarmers(new Set());
    } else {
      setSelectedFarmers(new Set(filteredFarmers.map(f => f.id)));
    }
  };

  // Handle farmer toggle
  const handleFarmerToggle = (farmerId: string) => {
    setSelectedFarmers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(farmerId)) {
        newSet.delete(farmerId);
      } else {
        newSet.add(farmerId);
      }
      return newSet;
    });
  };

  // Handle bulk assign
  const handleBulkAssign = async () => {
    if (!targetPengepul || selectedFarmers.size === 0) {
      toast({
        title: "Error",
        description: "Pilih petani dan pengepul tujuan",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    setProgress({ current: 0, total: selectedFarmers.size });

    const farmerIds = Array.from(selectedFarmers);
    let success = 0;
    let failed = 0;

    // Update in batches
    const batchSize = 10;
    for (let i = 0; i < farmerIds.length; i += batchSize) {
      const batch = farmerIds.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from("petani")
        .update({ pengepul_id: targetPengepul })
        .in("id", batch);

      if (error) {
        console.error("Error updating farmers:", error);
        failed += batch.length;
      } else {
        success += batch.length;
      }

      setProgress({ current: Math.min(i + batchSize, farmerIds.length), total: farmerIds.length });
    }

    setIsAssigning(false);
    setProgress({ current: 0, total: 0 });
    setSelectedFarmers(new Set());
    setDialogOpen(false);
    refetchFarmers();

    const pengepulName = pengepulList.find(p => p.id === targetPengepul)?.nama || "Unknown";

    if (success > 0) {
      toast({
        title: "Berhasil",
        description: `${success} petani berhasil dihubungkan ke pengepul ${pengepulName}`,
      });
    }
    if (failed > 0) {
      toast({
        title: "Sebagian Gagal",
        description: `${failed} petani gagal diupdate`,
        variant: "destructive",
      });
    }
  };

  // Select all unassigned
  const selectAllUnassigned = () => {
    setSelectedFarmers(new Set(farmersWithoutPengepul.map(f => f.id)));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Kelola Pengepul Petani
            </CardTitle>
            <CardDescription>
              Hubungkan petani ke pengepul untuk kelola data penjualan
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <UserCheck className="h-3 w-3 text-green-500" />
                {farmersWithPengepul.length} Terhubung
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                {farmersWithoutPengepul.length} Belum Terhubung
              </Badge>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Users className="h-4 w-4 mr-2" />
                  Assign Massal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Assign Pengepul ke Petani</DialogTitle>
                  <DialogDescription>
                    Pilih petani dan hubungkan ke pengepul tujuan
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                  {/* Filters */}
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari kode petani..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua Petani</SelectItem>
                        <SelectItem value="unassigned">Belum Terhubung</SelectItem>
                        <SelectItem value="assigned">Sudah Terhubung</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedFarmers.size === filteredFarmers.length ? "Batal Pilih Semua" : "Pilih Semua"}
                    </Button>
                    {farmersWithoutPengepul.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={selectAllUnassigned}
                      >
                        <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" />
                        Pilih Belum Terhubung ({farmersWithoutPengepul.length})
                      </Button>
                    )}
                    <div className="ml-auto text-sm text-muted-foreground">
                      {selectedFarmers.size} petani dipilih
                    </div>
                  </div>

                  {/* Farmer Table */}
                  <div className="border rounded-lg overflow-auto flex-1">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedFarmers.size === filteredFarmers.length && filteredFarmers.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          </TableHead>
                          <TableHead>Kode</TableHead>
                          <TableHead>Nama Petani</TableHead>
                          <TableHead>Pengepul Saat Ini</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredFarmers.map(farmer => {
                          const pengepulName = getPengepulName(farmer.pengepul_id);
                          return (
                            <TableRow 
                              key={farmer.id}
                              className={!farmer.pengepul_id ? "bg-yellow-500/5" : ""}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedFarmers.has(farmer.id)}
                                  onCheckedChange={() => handleFarmerToggle(farmer.id)}
                                />
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {farmer.kode_petani}
                              </TableCell>
                              <TableCell className="font-medium">
                                {farmer.nama}
                              </TableCell>
                              <TableCell>
                                {pengepulName || (
                                  <span className="text-muted-foreground italic">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {farmer.pengepul_id ? (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Terhubung
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Belum
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredFarmers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Tidak ada petani ditemukan
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Assign Action */}
                  <div className="flex items-center gap-4 pt-4 border-t">
                    <div className="flex-1">
                      <label className="text-sm font-medium mb-2 block">
                        Pengepul Tujuan
                      </label>
                      <Select value={targetPengepul} onValueChange={setTargetPengepul}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih pengepul..." />
                        </SelectTrigger>
                        <SelectContent>
                          {pengepulList.map(pengepul => (
                            <SelectItem key={pengepul.id} value={pengepul.id}>
                              {pengepul.nama} ({pengepul.kode_pengepul})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="pt-6">
                      <Button 
                        onClick={handleBulkAssign}
                        disabled={isAssigning || selectedFarmers.size === 0 || !targetPengepul}
                      >
                        {isAssigning ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Mengassign...
                          </>
                        ) : (
                          <>
                            <Link2 className="h-4 w-4 mr-2" />
                            Hubungkan {selectedFarmers.size} Petani
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {isAssigning && (
                    <div className="space-y-2">
                      <Progress value={(progress.current / progress.total) * 100} />
                      <p className="text-sm text-center text-muted-foreground">
                        {progress.current} / {progress.total}
                      </p>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {farmersWithoutPengepul.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  {farmersWithoutPengepul.length} petani belum terhubung ke pengepul
                </p>
                <p className="text-sm text-yellow-700">
                  Petani tanpa pengepul tidak akan muncul di auto-generate barang masuk
                </p>
              </div>
              <Button 
                variant="outline" 
                className="ml-auto border-yellow-500/50"
                onClick={() => setDialogOpen(true)}
              >
                Hubungkan Sekarang
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama Petani</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {farmersWithoutPengepul.slice(0, 10).map(farmer => (
                    <TableRow key={farmer.id}>
                      <TableCell className="font-mono text-sm">{farmer.kode_petani}</TableCell>
                      <TableCell className="font-medium">{farmer.nama}</TableCell>
                      <TableCell className="text-muted-foreground">{farmer.alamat || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/30">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Belum Terhubung
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {farmersWithoutPengepul.length > 10 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                  Dan {farmersWithoutPengepul.length - 10} petani lainnya...
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <UserCheck className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">
                Semua petani sudah terhubung ke pengepul
              </p>
              <p className="text-sm text-green-700">
                {farmersWithPengepul.length} petani aktif dengan pengepul terhubung
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
