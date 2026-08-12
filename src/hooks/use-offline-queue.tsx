import { useCallback, useEffect, useState } from "react";
import { flushQueue, listQueue, type QueueItem } from "@/lib/offline-queue";
import { toast } from "@/hooks/use-toast";

/** Tracks connectivity + pending offline records and auto-syncs when online. */
export const useOfflineQueue = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pending, setPending] = useState<QueueItem[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPending(await listQueue());
    } catch {
      setPending([]);
    }
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    const result = await flushQueue();
    setSyncing(false);
    await refresh();
    if (result.synced > 0) {
      toast({
        title: "Data offline tersinkron",
        description: `${result.synced} data lapangan berhasil diunggah.`,
      });
    }
    if (result.failed > 0) {
      toast({
        title: "Sebagian data offline gagal",
        description: `${result.failed} data masih menunggu, akan dicoba lagi.`,
        variant: "destructive",
      });
    }
  }, [refresh]);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    const onOnline = () => {
      setIsOnline(true);
      sync();
    };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("offline-queue-changed", onChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (navigator.onLine) sync();
    return () => {
      window.removeEventListener("offline-queue-changed", onChange);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isOnline, pending, pendingCount: pending.length, syncing, sync, refresh };
};
