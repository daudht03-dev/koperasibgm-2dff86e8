 import { useState } from "react";
 import { ArrowLeft, Sparkles, Bug, Wrench, Rocket, Settings } from "lucide-react";
 import { Link } from "react-router-dom";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Card, CardContent, CardHeader } from "@/components/ui/card";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Skeleton } from "@/components/ui/skeleton";
 import { useChangelog, ChangelogChange } from "@/hooks/use-changelog";
 import { useAuth } from "@/hooks/use-auth";
 import ChangelogManager from "@/components/ChangelogManager";
 
 const getChangeIcon = (type: ChangelogChange["type"]) => {
   switch (type) {
     case "feature":
       return <Sparkles className="h-4 w-4 text-primary" />;
     case "fix":
       return <Bug className="h-4 w-4 text-destructive" />;
     case "improvement":
       return <Wrench className="h-4 w-4 text-muted-foreground" />;
     case "breaking":
       return <Rocket className="h-4 w-4 text-secondary-foreground" />;
   }
 };
 
 const getChangeBadge = (type: ChangelogChange["type"]) => {
   switch (type) {
     case "feature":
       return (
         <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
           Fitur Baru
         </Badge>
       );
     case "fix":
       return (
         <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
           Perbaikan
         </Badge>
       );
     case "improvement":
       return (
         <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs">
           Peningkatan
         </Badge>
       );
     case "breaking":
       return (
         <Badge variant="outline" className="bg-secondary text-secondary-foreground border-secondary text-xs">
           Breaking Change
         </Badge>
       );
   }
 };
 
 const Changelog = () => {
   const { changelog, isLoading } = useChangelog();
   const { isAdmin } = useAuth();
   const [showManager, setShowManager] = useState(false);
 
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
             {isAdmin && (
               <Button
                 variant={showManager ? "default" : "outline"}
                 size="sm"
                 className="ml-auto"
                 onClick={() => setShowManager(!showManager)}
               >
                 <Settings className="h-4 w-4 mr-2" />
                 {showManager ? "Lihat Changelog" : "Kelola"}
               </Button>
             )}
           </div>
         </div>
       </div>
 
       {/* Content */}
       <ScrollArea className="h-[calc(100vh-80px)]">
         <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6">
           {showManager && isAdmin ? (
             <ChangelogManager />
           ) : isLoading ? (
             <div className="space-y-4">
               <Skeleton className="h-40 w-full" />
               <Skeleton className="h-40 w-full" />
               <Skeleton className="h-40 w-full" />
             </div>
           ) : (
             changelog.map((entry) => (
               <Card key={entry.id} className="overflow-hidden">
                 <CardHeader className="pb-3 bg-muted/30">
                   <div className="flex items-start justify-between gap-3">
                     <div className="space-y-1">
                       <div className="flex items-center gap-2">
                         <span className="text-2xl font-bold text-foreground">
                           v{entry.version}
                         </span>
                         {entry.is_latest && (
                           <Badge className="bg-gradient-organic text-primary-foreground">
                             Terbaru
                           </Badge>
                         )}
                       </div>
                       <p className="font-medium text-foreground">{entry.judul}</p>
                       <p className="text-sm text-muted-foreground">{entry.tanggal}</p>
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
             ))
           )}
 
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