 import { useEffect, useState } from "react";
 import { useRegisterSW } from "virtual:pwa-register/react";
 import { Button } from "@/components/ui/button";
 import { RefreshCw, X } from "lucide-react";
 import { toast } from "sonner";
 
 const PWAUpdatePrompt = () => {
   const [showPrompt, setShowPrompt] = useState(false);
 
   const {
     needRefresh: [needRefresh, setNeedRefresh],
     updateServiceWorker,
   } = useRegisterSW({
     onRegistered(registration) {
       console.log("SW Registered:", registration);
       
       // Check for updates every 60 seconds
       if (registration) {
         setInterval(() => {
           registration.update();
         }, 60 * 1000);
       }
     },
     onRegisterError(error) {
       console.error("SW registration error:", error);
     },
   });
 
   useEffect(() => {
     if (needRefresh) {
       setShowPrompt(true);
       // Also show a toast notification
       toast.info("Versi baru tersedia!", {
         description: "Klik untuk memperbarui aplikasi",
         duration: 10000,
         action: {
           label: "Update",
           onClick: () => handleUpdate(),
         },
       });
     }
   }, [needRefresh]);
 
   const handleUpdate = () => {
     updateServiceWorker(true);
   };
 
   const handleClose = () => {
     setShowPrompt(false);
     setNeedRefresh(false);
   };
 
   if (!showPrompt) return null;
 
   return (
     <div className="fixed bottom-4 left-4 right-4 z-[9998] md:left-auto md:right-4 md:w-96 animate-slide-up">
       <div className="bg-card border border-border rounded-xl shadow-2xl p-4 space-y-3">
         <div className="flex items-start justify-between gap-3">
           <div className="flex items-center gap-3">
             <div className="bg-primary/10 p-2 rounded-lg">
               <RefreshCw className="h-5 w-5 text-primary" />
             </div>
             <div>
               <h4 className="font-semibold text-foreground text-sm">
                 Pembaruan Tersedia
               </h4>
               <p className="text-xs text-muted-foreground">
                 Versi baru aplikasi siap diinstal
               </p>
             </div>
           </div>
           <Button
             variant="ghost"
             size="icon"
             className="h-8 w-8 shrink-0"
             onClick={handleClose}
           >
             <X className="h-4 w-4" />
           </Button>
         </div>
 
         <div className="flex gap-2">
           <Button
             variant="outline"
             size="sm"
             className="flex-1"
             onClick={handleClose}
           >
             Nanti
           </Button>
           <Button
             size="sm"
             className="flex-1 bg-gradient-organic shadow-organic"
             onClick={handleUpdate}
           >
             <RefreshCw className="h-4 w-4 mr-2" />
             Update Sekarang
           </Button>
         </div>
       </div>
     </div>
   );
 };
 
 export default PWAUpdatePrompt;