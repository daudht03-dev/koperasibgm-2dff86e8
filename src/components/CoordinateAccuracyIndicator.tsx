/** Visual indicator for coordinate accuracy scoring. */
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AccuracyResult } from "@/lib/coordinate-accuracy";

export const CoordinateAccuracyIndicator = ({ result }: { result: AccuracyResult }) => {
  const tone =
    result.level === "tinggi"
      ? "border-emerald-500 text-emerald-600"
      : result.level === "sedang"
        ? "border-amber-500 text-amber-600"
        : "border-destructive text-destructive";

  return (
    <div className="rounded-md border p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Akurasi Koordinat</span>
        <Badge variant="outline" className={tone}>
          {result.level === "invalid" ? "Tidak valid" : `${result.score}/100 · ${result.level}`}
        </Badge>
      </div>
      <Progress value={result.score} className="h-2" />
      <ul className="space-y-1">
        {result.issues.map((i, idx) => (
          <li key={`i-${idx}`} className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{i}</span>
          </li>
        ))}
        {result.notes.map((n, idx) => (
          <li key={`n-${idx}`} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            {result.issues.length === 0 && idx === 0 ? (
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            )}
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CoordinateAccuracyIndicator;
