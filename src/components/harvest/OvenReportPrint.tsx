import { forwardRef, useMemo } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ProsesPengeringan, PetaniDetailPengeringan } from "@/hooks/use-batch-panen";

interface OvenReportPrintProps {
  proses: ProsesPengeringan[];
  startDate: Date | null;
  endDate: Date | null;
  companyName?: string;
}

export const OvenReportPrint = forwardRef<HTMLDivElement, OvenReportPrintProps>(
  ({ proses, startDate, endDate, companyName = "Kelapa Organik" }, ref) => {
    // Filter proses by date range
    const filteredProses = useMemo(() => {
      return proses.filter(p => {
        if (p.status !== 'selesai') return false;
        if (!startDate || !endDate) return true;
        
        const prosesDate = new Date(p.tanggal_selesai || p.tanggal_mulai);
        return prosesDate >= startDate && prosesDate <= endDate;
      });
    }, [proses, startDate, endDate]);

    // Calculate totals
    const totals = useMemo(() => {
      return filteredProses.reduce((acc, p) => ({
        bahanMasuk: acc.bahanMasuk + Number(p.jumlah_kg_sebelum || 0),
        totalKering: acc.totalKering + Number(p.total_kering || 0),
        qcOff: acc.qcOff + Number(p.qc_off || 0),
        totalKeringPacking: acc.totalKeringPacking + Number(p.total_kering_packing || 0),
      }), {
        bahanMasuk: 0,
        totalKering: 0,
        qcOff: 0,
        totalKeringPacking: 0,
      });
    }, [filteredProses]);

    const avgSusut = filteredProses.length > 0
      ? filteredProses.reduce((sum, p) => sum + (p.susut_persen || 0), 0) / filteredProses.length
      : 0;

    const fmt1 = (n: number) => n.toFixed(1);

    const getDetailPetani = (p: ProsesPengeringan): PetaniDetailPengeringan[] => {
      if (Array.isArray(p.detail_petani)) {
        return p.detail_petani as PetaniDetailPengeringan[];
      }
      return [];
    };

    const periodLabel = startDate && endDate
      ? `${format(startDate, "dd MMMM yyyy", { locale: localeId })} - ${format(endDate, "dd MMMM yyyy", { locale: localeId })}`
      : "Semua Periode";

    return (
      <div ref={ref} className="p-8 bg-white text-black print:p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="text-center mb-6 border-b-2 border-black pb-4">
          <h1 className="text-2xl font-bold mb-1">{companyName}</h1>
          <h2 className="text-xl font-semibold">LAPORAN HASIL PENGOVENAN</h2>
          <p className="text-sm mt-2">Periode: {periodLabel}</p>
          <p className="text-xs text-gray-600">Dicetak: {format(new Date(), "dd MMMM yyyy HH:mm", { locale: localeId })}</p>
        </div>

        {/* Summary */}
        <div className="mb-6 p-4 border border-gray-300 rounded">
          <h3 className="font-bold text-lg mb-3 border-b pb-2">RINGKASAN</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Proses:</span>
              <p className="font-bold text-lg">{filteredProses.length} Batch</p>
            </div>
            <div>
              <span className="text-gray-600">Total Bahan Masuk:</span>
              <p className="font-bold text-lg">{totals.bahanMasuk.toLocaleString()} Kg</p>
            </div>
            <div>
              <span className="text-gray-600">Total Hasil Kering:</span>
              <p className="font-bold text-lg">{totals.totalKering.toLocaleString()} Kg</p>
            </div>
            <div>
              <span className="text-gray-600">Total Hasil Packing:</span>
              <p className="font-bold text-lg text-green-700">{totals.totalKeringPacking.toLocaleString()} Kg</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mt-3 pt-3 border-t">
            <div>
              <span className="text-gray-600">Rata-rata Susut:</span>
              <p className="font-bold">{fmt1(avgSusut)}%</p>
            </div>
            <div>
              <span className="text-gray-600">Total QC Off:</span>
              <p className="font-bold text-red-600">{totals.qcOff.toLocaleString()} Kg</p>
            </div>
            <div>
              <span className="text-gray-600">Total Penyusutan:</span>
              <p className="font-bold text-orange-600">{(totals.bahanMasuk - totals.totalKering).toLocaleString()} Kg</p>
            </div>
            <div>
              <span className="text-gray-600">Efisiensi:</span>
              <p className="font-bold">{totals.bahanMasuk > 0 ? fmt1((totals.totalKeringPacking / totals.bahanMasuk) * 100) : 0}%</p>
            </div>
          </div>
        </div>

        {/* Detail per Process */}
        {filteredProses.map((p, index) => {
          const farmers = getDetailPetani(p);
          const totalFarmerKg = farmers.reduce((sum, f) => sum + (f.jumlah_kg || 0), 0);

          return (
            <div key={p.id} className="mb-6 page-break-inside-avoid">
              <div className="border border-gray-400 rounded overflow-hidden">
                {/* Process Header */}
                <div className="bg-gray-100 p-3 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-lg">{index + 1}. {p.lot_number || '-'}</span>
                    <span className={`ml-3 px-2 py-0.5 rounded text-xs font-medium ${p.is_organic ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                      {p.is_organic ? 'Organik' : 'Konvensional'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {p.tanggal_selesai 
                      ? format(new Date(p.tanggal_selesai), "dd MMM yyyy", { locale: localeId })
                      : '-'
                    }
                  </div>
                </div>

                {/* Farmer Details */}
                {farmers.length > 0 && (
                  <div className="p-3 border-b border-gray-200">
                    <p className="font-medium text-sm mb-2">Detail Petani ({farmers.length} petani):</p>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-2 py-1 text-left">No</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">Kode</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">Nama Petani</th>
                          <th className="border border-gray-300 px-2 py-1 text-right">Jumlah (Kg)</th>
                          <th className="border border-gray-300 px-2 py-1 text-right">Kontribusi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {farmers.map((f, i) => (
                          <tr key={f.petani_id}>
                            <td className="border border-gray-300 px-2 py-1">{i + 1}</td>
                            <td className="border border-gray-300 px-2 py-1 font-mono">{f.petani_kode}</td>
                            <td className="border border-gray-300 px-2 py-1">{f.petani_nama}</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">{(f.jumlah_kg || 0).toLocaleString()}</td>
                            <td className="border border-gray-300 px-2 py-1 text-right">
                              {totalFarmerKg > 0 ? ((f.jumlah_kg / totalFarmerKg) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 font-bold">
                          <td colSpan={3} className="border border-gray-300 px-2 py-1 text-right">Total:</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">{totalFarmerKg.toLocaleString()}</td>
                          <td className="border border-gray-300 px-2 py-1 text-right">100%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Calculation Details */}
                <div className="p-3">
                  <p className="font-medium text-sm mb-2">Perhitungan Susut:</p>
                  <table className="w-full text-sm border-collapse">
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium w-1/3">Bahan Masuk</td>
                        <td className="border border-gray-300 px-3 py-2 text-right">{Number(p.jumlah_kg_sebelum).toLocaleString()} Kg</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">Susut Pengeringan</td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-orange-600">
                          {p.susut_persen || 0}% ({((Number(p.jumlah_kg_sebelum) * (p.susut_persen || 0)) / 100).toLocaleString()} Kg)
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">Total Kering</td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-bold">{Number(p.total_kering || 0).toLocaleString()} Kg</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 bg-gray-50 font-medium">QC Off</td>
                        <td className="border border-gray-300 px-3 py-2 text-right text-red-600">
                          {p.susut_qc_off_persen || 0}% ({Number(p.qc_off || 0).toLocaleString()} Kg)
                        </td>
                      </tr>
                      <tr className="bg-green-50">
                        <td className="border border-gray-300 px-3 py-2 font-bold">Hasil Packing</td>
                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-700 text-lg">
                          {Number(p.total_kering_packing || 0).toLocaleString()} Kg
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {p.operator && (
                    <p className="text-xs text-gray-500 mt-2">Operator: {p.operator}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredProses.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Tidak ada data pengovenan pada periode ini
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-sm">
          <div className="flex justify-between">
            <div>
              <p className="mb-8">Mengetahui,</p>
              <p className="border-t border-black pt-1 inline-block min-w-[200px]">Kepala Produksi</p>
            </div>
            <div className="text-right">
              <p className="mb-8">Dibuat oleh,</p>
              <p className="border-t border-black pt-1 inline-block min-w-[200px]">Operator</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

OvenReportPrint.displayName = "OvenReportPrint";
