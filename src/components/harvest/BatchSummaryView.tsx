import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, Flame, Warehouse, FileText, ShoppingCart, 
  ChevronDown, ChevronRight, Users, Leaf, Factory,
  CheckCircle2, Clock, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { BatchPanen, ProsesPengeringan, GudangStok, BatchStatus } from "@/hooks/use-batch-panen";

interface PetaniDetail {
  petani_id: string;
  petani_nama: string;
  petani_kode: string;
  jumlah_kg: number;
  is_organic?: boolean;
}

interface BatchSummaryViewProps {
  batches: BatchPanen[];
  prosesPengeringan: ProsesPengeringan[];
  gudangStok: GudangStok[];
}

const statusConfig: Record<BatchStatus, { label: string; color: string; icon: React.ReactNode }> = {
  penerimaan: { label: "Penerimaan", color: "bg-blue-100 text-blue-800 border-blue-200", icon: <Package className="h-4 w-4" /> },
  pengeringan: { label: "Pengeringan", color: "bg-orange-100 text-orange-800 border-orange-200", icon: <Flame className="h-4 w-4" /> },
  penyimpanan: { label: "Penyimpanan", color: "bg-purple-100 text-purple-800 border-purple-200", icon: <Warehouse className="h-4 w-4" /> },
  pengolahan: { label: "Pengolahan", color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: <FileText className="h-4 w-4" /> },
  penjualan: { label: "Penjualan", color: "bg-green-100 text-green-800 border-green-200", icon: <ShoppingCart className="h-4 w-4" /> },
  selesai: { label: "Selesai", color: "bg-gray-100 text-gray-800 border-gray-200", icon: <CheckCircle2 className="h-4 w-4" /> },
};

export const BatchSummaryView = ({ batches, prosesPengeringan, gudangStok }: BatchSummaryViewProps) => {
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  const toggleBatch = (batchId: string) => {
    setExpandedBatches(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const getBatchProses = (batchId: string) => {
    return prosesPengeringan.filter(p => p.batch_id === batchId);
  };

  const getBatchStok = (batchId: string) => {
    return gudangStok.filter(s => s.batch_id === batchId);
  };

  const getDetailPetani = (detailPetani: unknown): PetaniDetail[] => {
    if (!detailPetani || !Array.isArray(detailPetani)) return [];
    return detailPetani as PetaniDetail[];
  };

  const summarizePetani = (details: PetaniDetail[]) => {
    const grouped = details.reduce((acc, d) => {
      const key = d.petani_id;
      if (!acc[key]) {
        acc[key] = { ...d, jumlah_kg: 0 };
      }
      acc[key].jumlah_kg += d.jumlah_kg;
      return acc;
    }, {} as Record<string, PetaniDetail>);
    return Object.values(grouped);
  };

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Belum ada batch yang tercatat</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Ringkasan Batch & Detail Petani
          </CardTitle>
          <CardDescription>
            Lihat ringkasan setiap batch beserta petani yang berkontribusi di setiap tahap proses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {batches.map((batch) => {
                const isExpanded = expandedBatches.has(batch.id);
                const proses = getBatchProses(batch.id);
                const stok = getBatchStok(batch.id);
                const petaniDetails = getDetailPetani(batch.detail_petani);
                const summarizedPetani = summarizePetani(petaniDetails);
                const statusInfo = statusConfig[batch.status || 'penerimaan'];

                return (
                  <Collapsible key={batch.id} open={isExpanded} onOpenChange={() => toggleBatch(batch.id)}>
                    <Card className="border">
                      <CollapsibleTrigger asChild>
                        <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold">{batch.batch_number}</span>
                                  <Badge variant="outline" className={statusInfo.color}>
                                    {statusInfo.icon}
                                    <span className="ml-1">{statusInfo.label}</span>
                                  </Badge>
                                  {batch.is_organic ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      <Leaf className="h-3 w-3 mr-1" />
                                      Organik
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                      <Factory className="h-3 w-3 mr-1" />
                                      Konvensional
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {format(new Date(batch.tanggal_penerimaan), "d MMMM yyyy", { locale: localeId })} • {batch.jumlah_kg} kg
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {summarizedPetani.length} petani
                              </span>
                              <span className="flex items-center gap-1">
                                <Flame className="h-4 w-4" />
                                {proses.length} proses
                              </span>
                              <span className="flex items-center gap-1">
                                <Warehouse className="h-4 w-4" />
                                {stok.length} stok
                              </span>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t px-4 pb-4 space-y-4">
                          {/* Tahap Penerimaan - Detail Petani */}
                          <div className="mt-4">
                            <h4 className="font-medium flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-blue-600" />
                              Tahap Penerimaan - Detail Petani
                            </h4>
                            {summarizedPetani.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Petani</TableHead>
                                    <TableHead>Kode</TableHead>
                                    <TableHead className="text-right">Jumlah (kg)</TableHead>
                                    <TableHead>Tipe</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {summarizedPetani.map((petani, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell className="font-medium">{petani.petani_nama}</TableCell>
                                      <TableCell>{petani.petani_kode}</TableCell>
                                      <TableCell className="text-right">{petani.jumlah_kg.toFixed(1)}</TableCell>
                                      <TableCell>
                                        {petani.is_organic ? (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">Organik</Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-gray-50 text-gray-700 text-xs">Konvensional</Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">Tidak ada data petani</p>
                            )}
                          </div>

                          {/* Tahap Pengeringan */}
                          <div>
                            <h4 className="font-medium flex items-center gap-2 mb-2">
                              <Flame className="h-4 w-4 text-orange-600" />
                              Tahap Pengeringan
                            </h4>
                            {proses.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Lot Number</TableHead>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead className="text-right">Sebelum (kg)</TableHead>
                                    <TableHead className="text-right">Sesudah (kg)</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Petani Diproses</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {proses.map((p) => {
                                    const prosesDetailPetani = getDetailPetani(p.detail_petani);
                                    return (
                                      <TableRow key={p.id}>
                                        <TableCell className="font-mono text-sm">{p.lot_number || '-'}</TableCell>
                                        <TableCell>
                                          {format(new Date(p.tanggal_mulai), "d MMM yyyy", { locale: localeId })}
                                        </TableCell>
                                        <TableCell className="text-right">{p.jumlah_kg_sebelum}</TableCell>
                                        <TableCell className="text-right">{p.total_kering_packing || '-'}</TableCell>
                                        <TableCell>
                                          <Badge variant={p.status === 'selesai' ? 'default' : 'secondary'}>
                                            {p.status === 'selesai' ? (
                                              <><CheckCircle2 className="h-3 w-3 mr-1" />Selesai</>
                                            ) : (
                                              <><Clock className="h-3 w-3 mr-1" />Proses</>
                                            )}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          {prosesDetailPetani.length > 0 ? (
                                            <div className="text-sm">
                                              {prosesDetailPetani.map((pd, i) => (
                                                <span key={i}>
                                                  {pd.petani_nama} ({pd.jumlah_kg.toFixed(1)} kg)
                                                  {i < prosesDetailPetani.length - 1 && ', '}
                                                </span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                                <AlertCircle className="h-4 w-4" />
                                Belum ada proses pengeringan
                              </div>
                            )}
                          </div>

                          {/* Tahap Penyimpanan */}
                          <div>
                            <h4 className="font-medium flex items-center gap-2 mb-2">
                              <Warehouse className="h-4 w-4 text-purple-600" />
                              Tahap Penyimpanan
                            </h4>
                            {stok.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Tipe Stok</TableHead>
                                    <TableHead>Lokasi</TableHead>
                                    <TableHead className="text-right">Jumlah (kg)</TableHead>
                                    <TableHead>Tanggal Masuk</TableHead>
                                    <TableHead>Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {stok.map((s) => (
                                    <TableRow key={s.id}>
                                      <TableCell>
                                        <Badge variant="outline">
                                          {s.tipe_stok === 'setelah_oven' ? 'Produk Jadi' : 'Bahan Baku'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>{s.lokasi_gudang}</TableCell>
                                      <TableCell className="text-right">{s.jumlah_kg}</TableCell>
                                      <TableCell>
                                        {format(new Date(s.tanggal_masuk), "d MMM yyyy", { locale: localeId })}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={s.status === 'tersimpan' ? 'default' : 'secondary'}>
                                          {s.status || 'tersimpan'}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground italic">
                                <AlertCircle className="h-4 w-4" />
                                Belum ada stok gudang
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
