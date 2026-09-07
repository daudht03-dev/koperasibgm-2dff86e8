import { useEffect, useState } from "react";
import { useOfflineFarmers } from "./use-offline-farmers";
import { toast } from "./use-toast";
import { flushQueue, listQueue } from "@/lib/offline-queue";

export const useOnlineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const { syncAllFarmers, offlineFarmers } = useOfflineFarmers();

  const syncOfflineQueue = async () => {
    const result = await flushQueue();
    if (result.synced > 0) {
      toast({
        title: "Antrian offline tersinkron",
        description: `${result.synced} item tersinkron`,
      });
    }
    if (result.failed > 0) {
      toast({
        title: "Sebagian antrian gagal tersinkron",
        description: `${result.failed} item gagal, akan dicoba lagi nanti`,
        variant: "destructive",
      });
    }
    return result;
  };

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);

      // Sync the offline queue (foto, petani/lahan baru, koordinat, dll.)
      await syncOfflineQueue();

      // Only sync if there's offline data
      if (offlineFarmers.length > 0) {
        toast({
          title: "Kembali Online",
          description: "Memperbarui data offline...",
        });

        const result = await syncAllFarmers();

        if (result.success && result.synced > 0) {
          toast({
            title: "Sinkronisasi Berhasil",
            description: `${result.synced} data petani berhasil diperbarui`,
          });
        }
      }

      setIsSyncing(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Mode Offline",
        description: "Anda sedang offline. Data akan disinkronkan saat online kembali.",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // On mount: flush any leftover queue from a previous offline session
    // (device was already back online before the app was reopened).
    if (navigator.onLine) {
      listQueue()
        .then((items) => (items.length > 0 ? syncOfflineQueue() : null))
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offlineFarmers.length, syncAllFarmers]);

  return { isOnline, isSyncing };
};
