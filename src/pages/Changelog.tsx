 import { ArrowLeft, Sparkles, Bug, Wrench, Rocket } from "lucide-react";
 import { Link } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Card, CardContent, CardHeader } from "@/components/ui/card";
 import { ScrollArea } from "@/components/ui/scroll-area";
 
 interface ChangelogEntry {
   version: string;
   date: string;
   title: string;
   isLatest?: boolean;
   changes: {
     type: "feature" | "fix" | "improvement" | "breaking";
     description: string;
   }[];
 }
 
 const changelog: ChangelogEntry[] = [
   {
     version: "1.3.0",
     date: "5 Februari 2025",
     title: "Update Estimasi Panen & PWA",
     isLatest: true,
     changes: [
       {
         type: "feature",
         description: "Fitur import rata-rata panen dari file CSV pada import petani",
       },
       {
         type: "feature",
         description: "Mode persentase (gacha) untuk pengaturan hari libur dengan rate yang bisa dikustomisasi",
       },
       {
         type: "feature",
         description: "Pengelompokan petani berdasarkan regulasi EU dan COR",
       },
       {
         type: "feature",
         description: "Notifikasi update otomatis untuk PWA yang sudah terinstal",
       },
       {
         type: "feature",
         description: "Halaman changelog untuk melihat riwayat perubahan aplikasi",
       },
       {
         type: "improvement",
         description: "Template CSV petani sekarang mendukung kolom rata-rata panen dan regulasi",
       },
     ],
   },
   {
     version: "1.2.0",
     date: "1 Februari 2025",
     title: "Manajemen Panen & Gudang",
     changes: [
       {
         type: "feature",
         description: "Tab Barang Masuk untuk pencatatan penerimaan barang",
       },
       {
         type: "feature",
         description: "Tab Gudang untuk manajemen stok di gudang",
       },
       {
         type: "feature",
         description: "Tab Pengovenan untuk proses pengeringan",
       },
       {
         type: "feature",
         description: "Laporan pengepul dengan detail transaksi",
       },
       {
         type: "improvement",
         description: "Optimasi performa loading data petani",
       },
     ],
   },
   {
     version: "1.1.0",
     date: "25 Januari 2025",
     title: "Label & QR Code",
     changes: [
       {
         type: "feature",
         description: "Generator label kemasan dengan template kustom",
       },
       {
         type: "feature",
         description: "Label identitas petani dengan QR code",
       },
       {
         type: "feature",
         description: "Batch print QR code untuk semua petani",
       },
       {
         type: "improvement",
         description: "Desain label yang lebih profesional",
       },
       {
         type: "fix",
         description: "Perbaikan ukuran QR code pada print",
       },
     ],
   },
   {
     version: "1.0.0",
     date: "15 Januari 2025",
     title: "Rilis Pertama",
     changes: [
       {
         type: "feature",
         description: "Dashboard admin dengan statistik lengkap",
       },
       {
         type: "feature",
         description: "Manajemen data petani",
       },
       {
         type: "feature",
         description: "Manajemen lahan per petani",
       },
       {
         type: "feature",
         description: "Profil petani publik dengan QR code",
       },
       {
         type: "feature",
         description: "PWA support untuk instalasi di perangkat",
       },
       {
         type: "feature",
         description: "Mode offline untuk data petani",
       },
     ],
   },
 ];
 
 const getChangeIcon = (type: ChangelogEntry["changes"][0]["type"]) => {
   switch (type) {
     case "feature":
       return <Sparkles className="h-4 w-4 text-organic-green" />;
     case "fix":
       return <Bug className="h-4 w-4 text-red-500" />;
     case "improvement":
       return <Wrench className="h-4 w-4 text-blue-500" />;
     case "breaking":
       return <Rocket className="h-4 w-4 text-orange-500" />;
   }
 };
 
 const getChangeBadge = (type: ChangelogEntry["changes"][0]["type"]) => {
   switch (type) {
     case "feature":
       return (
         <Badge variant="outline" className="bg-organic-green/10 text-organic-green border-organic-green/30 text-xs">
           Fitur Baru
         </Badge>
       );
     case "fix":
       return (
         <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30 text-xs">
           Perbaikan
         </Badge>
       );
     case "improvement":
       return (
         <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-xs">
           Peningkatan
         </Badge>
       );
     case "breaking":
       return (
         <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30 text-xs">
           Breaking Change
         </Badge>
       );
   }
 };
 
 const Changelog = () => {
   return (
     <div className="min-h-screen bg-gradient-natural">
       {/* Header */}
       <div className="bg-card border-b border-border sticky top-0 z-10">
         <div className="container max-w-3xl mx-auto px-4 py-4">
           <div className="flex items-center gap-3">
             <Button variant="ghost" size="icon" asChild>
               <Link to="/admin">
                 <ArrowLeft className="h-5 w-5" />
               </Link>
             </Button>
             <div>
               <h1 className="text-xl font-bold text-foreground">Changelog</h1>
               <p className="text-sm text-muted-foreground">Riwayat perubahan aplikasi</p>
             </div>
           </div>
         </div>
       </div>
 
       {/* Content */}
       <ScrollArea className="h-[calc(100vh-80px)]">
         <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
           {changelog.map((entry, index) => (
             <Card key={entry.version} className="overflow-hidden">
               <CardHeader className="pb-3 bg-muted/30">
                 <div className="flex items-start justify-between gap-3">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <span className="text-2xl font-bold text-foreground">
                         v{entry.version}
                       </span>
                       {entry.isLatest && (
                         <Badge className="bg-gradient-organic text-primary-foreground">
                           Terbaru
                         </Badge>
                       )}
                     </div>
                     <p className="font-medium text-foreground">{entry.title}</p>
                     <p className="text-sm text-muted-foreground">{entry.date}</p>
                   </div>
                 </div>
               </CardHeader>
               <CardContent className="pt-4">
                 <ul className="space-y-3">
                   {entry.changes.map((change, changeIndex) => (
                     <li key={changeIndex} className="flex items-start gap-3">
                       <div className="mt-0.5 shrink-0">
                         {getChangeIcon(change.type)}
                       </div>
                       <div className="flex-1 space-y-1">
                         <p className="text-sm text-foreground">{change.description}</p>
                         {getChangeBadge(change.type)}
                       </div>
                     </li>
                   ))}
                 </ul>
               </CardContent>
             </Card>
           ))}
 
           {/* Footer */}
           <div className="text-center py-8 text-sm text-muted-foreground">
             <p>© {new Date().getFullYear()} Berkah Gendis Mandiri</p>
             <p className="mt-1">Versi saat ini: v{changelog[0]?.version}</p>
           </div>
         </div>
       </ScrollArea>
     </div>
   );
 };
 
 export default Changelog;