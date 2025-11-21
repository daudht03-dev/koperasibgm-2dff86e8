import { useEffect, useState } from "react";
import { useOfflineFarmers } from "./use-offline-farmers";
import { toast } from "./use-toast";

export const useOnlineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const { syncAllFarmers, offlineFarmers } = useOfflineFarmers();

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      
      // Only sync if there's offline data
      if (offlineFarmers.length > 0) {
        setIsSyncing(true);
        
        toast({
          title: "Kembali Online",
          description: "Memperbarui data offline...",
        });

        const result = await syncAllFarmers();
        
        setIsSyncing(false);

        if (result.success && result.synced > 0) {
          toast({
            title: "Sinkronisasi Berhasil",
            description: `${result.synced} data petani berhasil diperbarui`,
          });
        }
      }
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

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [offlineFarmers.length, syncAllFarmers]);

  return { isOnline, isSyncing };
};
