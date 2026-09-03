/**
 * In-page camera capture.
 *
 * Uses getUserMedia so the user never leaves the PWA (an app-switch to the
 * Android camera app frequently gets the WebView killed on low-RAM devices).
 * Falls back to <input type="file" capture="environment"> when getUserMedia
 * is unavailable or denied.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Loader2, RefreshCw, X, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called with the captured photo. The dialog closes right after. */
  onCapture: (file: File) => void;
}

export const InPageCameraCapture = ({ open, onOpenChange, onCapture }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [starting, setStarting] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startStream = useCallback(
    async (mode: "environment" | "user") => {
      setError(null);
      setStarting(true);
      stopStream();
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Kamera dalam halaman tidak didukung browser ini.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        streamRef.current = stream;

        stream.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            setError("Kamera terputus. Coba lagi atau gunakan kamera bawaan.");
          });
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }

        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setHasMultipleCameras(
            devices.filter((d) => d.kind === "videoinput").length > 1,
          );
        } catch {
          setHasMultipleCameras(false);
        }
      } catch (e) {
        stopStream();
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          /denied|NotAllowed/i.test(msg)
            ? "Izin kamera ditolak."
            : "Kamera tidak dapat dibuka.",
        );
      } finally {
        setStarting(false);
      }
    },
    [stopStream],
  );

  useEffect(() => {
    if (open) {
      void startStream(facing);
    } else {
      stopStream();
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, facing]);

  useEffect(() => stopStream, [stopStream]);

  const handleShoot = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;
    setShooting(true);
    try {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) throw new Error("blob");
      const file = new File([blob], `kamera-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      stopStream();
      onOpenChange(false);
      onCapture(file);
    } catch {
      setError("Gagal mengambil gambar dari kamera.");
    } finally {
      setShooting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) stopStream();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" /> Ambil Foto
          </DialogTitle>
          <DialogDescription>
            Kamera berjalan di dalam aplikasi agar data tidak hilang.
          </DialogDescription>
        </DialogHeader>

        <div className="relative bg-black aspect-[3/4] sm:aspect-video w-full">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center bg-background/95">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => startStream(facing)}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Coba Lagi
                </Button>
                <Button size="sm" onClick={() => fallbackInputRef.current?.click()}>
                  <Camera className="h-4 w-4 mr-2" /> Pakai Kamera Bawaan
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Tutup
          </Button>
          <Button
            size="lg"
            className="rounded-full h-16 w-16 p-0"
            onClick={handleShoot}
            disabled={!!error || starting || shooting}
            aria-label="Jepret foto"
          >
            {shooting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Camera className="h-6 w-6" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMultipleCameras || starting}
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Balik
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
        <input
          ref={fallbackInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) {
              stopStream();
              onOpenChange(false);
              onCapture(f);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default InPageCameraCapture;
