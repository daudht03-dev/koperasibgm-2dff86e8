import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Printer, CalendarIcon, FileText } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ProsesPengeringan } from "@/hooks/use-batch-panen";
import { OvenReportPrint } from "./OvenReportPrint";

interface OvenReportDialogProps {
  proses: ProsesPengeringan[];
  companyName?: string;
}

export const OvenReportDialog = ({ proses, companyName }: OvenReportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Laporan-Pengovenan-${format(new Date(), "yyyy-MM-dd")}`,
  });

  const quickSelections = [
    { 
      label: "Bulan Ini", 
      start: startOfMonth(new Date()), 
      end: endOfMonth(new Date()) 
    },
    { 
      label: "Bulan Lalu", 
      start: startOfMonth(subMonths(new Date(), 1)), 
      end: endOfMonth(subMonths(new Date(), 1)) 
    },
    { 
      label: "3 Bulan Terakhir", 
      start: startOfMonth(subMonths(new Date(), 2)), 
      end: endOfMonth(new Date()) 
    },
    { 
      label: "Semua", 
      start: undefined, 
      end: undefined 
    },
  ];

  // Count filtered proses
  const filteredCount = proses.filter(p => {
    if (p.status !== 'selesai') return false;
    if (!startDate || !endDate) return true;
    const prosesDate = new Date(p.tanggal_selesai || p.tanggal_mulai);
    return prosesDate >= startDate && prosesDate <= endDate;
  }).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Printer className="h-4 w-4" />
          Cetak Laporan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cetak Laporan Hasil Pengovenan
          </DialogTitle>
          <DialogDescription>
            Pilih periode untuk mencetak laporan hasil pengovenan dengan detail petani dan perhitungan susut
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Selections */}
          <div>
            <Label className="text-sm mb-2 block">Pilih Cepat:</Label>
            <div className="flex flex-wrap gap-2">
              {quickSelections.map((q) => (
                <Button
                  key={q.label}
                  variant={
                    (q.start?.getTime() === startDate?.getTime() && q.end?.getTime() === endDate?.getTime()) ||
                    (q.start === undefined && startDate === undefined)
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => {
                    setStartDate(q.start);
                    setEndDate(q.end);
                  }}
                >
                  {q.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-2 block">Tanggal Mulai:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd MMMM yyyy", { locale: localeId }) : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                    locale={localeId}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Tanggal Akhir:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd MMMM yyyy", { locale: localeId }) : "Pilih tanggal"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    locale={localeId}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Data yang akan dicetak:</span>{" "}
              <span className="font-bold text-primary">{filteredCount} proses pengovenan</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Periode: {startDate ? format(startDate, "dd MMM yyyy", { locale: localeId }) : "Semua"} 
              {" - "}
              {endDate ? format(endDate, "dd MMM yyyy", { locale: localeId }) : "Semua"}
            </p>
          </div>

          {/* Print Preview */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            <div className="scale-75 origin-top-left" style={{ width: '133.33%' }}>
              <OvenReportPrint
                ref={printRef}
                proses={proses}
                startDate={startDate || null}
                endDate={endDate || null}
                companyName={companyName}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => handlePrint()} className="gap-2" disabled={filteredCount === 0}>
              <Printer className="h-4 w-4" />
              Cetak ({filteredCount} data)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
