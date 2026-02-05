 import { useState } from "react";
 import { Plus, Pencil, Trash2, Save, X, GripVertical } from "lucide-react";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Switch } from "@/components/ui/switch";
 import { Label } from "@/components/ui/label";
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 import { useChangelog, ChangelogEntry, ChangelogChange } from "@/hooks/use-changelog";
 import { Skeleton } from "@/components/ui/skeleton";
 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogTrigger,
 } from "@/components/ui/alert-dialog";
 
 interface ChangelogFormData {
   version: string;
   tanggal: string;
   judul: string;
   is_latest: boolean;
   changes: ChangelogChange[];
 }
 
 const emptyForm: ChangelogFormData = {
   version: "",
   tanggal: new Date().toISOString().split("T")[0],
   judul: "",
   is_latest: false,
   changes: [],
 };
 
 const ChangelogManager = () => {
   const { changelog, isLoading, createEntry, updateEntry, deleteEntry } = useChangelog();
   const [editingId, setEditingId] = useState<string | null>(null);
   const [formData, setFormData] = useState<ChangelogFormData>(emptyForm);
   const [isCreating, setIsCreating] = useState(false);
 
   const handleEdit = (entry: ChangelogEntry) => {
     setEditingId(entry.id);
     setFormData({
       version: entry.version,
       tanggal: entry.tanggal,
       judul: entry.judul,
       is_latest: entry.is_latest,
       changes: entry.changes,
     });
     setIsCreating(false);
   };
 
   const handleCreate = () => {
     setIsCreating(true);
     setEditingId(null);
     setFormData(emptyForm);
   };
 
   const handleCancel = () => {
     setEditingId(null);
     setIsCreating(false);
     setFormData(emptyForm);
   };
 
   const handleSave = async () => {
     if (isCreating) {
       await createEntry.mutateAsync(formData);
     } else if (editingId) {
       await updateEntry.mutateAsync({ id: editingId, ...formData });
     }
     handleCancel();
   };
 
   const handleDelete = async (id: string) => {
     await deleteEntry.mutateAsync(id);
   };
 
   const addChange = () => {
     setFormData({
       ...formData,
       changes: [...formData.changes, { type: "feature", description: "" }],
     });
   };
 
   const updateChange = (index: number, field: keyof ChangelogChange, value: string) => {
     const newChanges = [...formData.changes];
     newChanges[index] = { ...newChanges[index], [field]: value };
     setFormData({ ...formData, changes: newChanges });
   };
 
   const removeChange = (index: number) => {
     setFormData({
       ...formData,
       changes: formData.changes.filter((_, i) => i !== index),
     });
   };
 
   const getTypeBadge = (type: string) => {
     switch (type) {
       case "feature":
         return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">Fitur</Badge>;
       case "fix":
         return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">Perbaikan</Badge>;
       case "improvement":
         return <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent text-xs">Peningkatan</Badge>;
       case "breaking":
         return <Badge variant="outline" className="bg-secondary/20 text-secondary-foreground border-secondary text-xs">Breaking</Badge>;
       default:
         return null;
     }
   };
 
   if (isLoading) {
     return (
       <div className="space-y-4">
         <Skeleton className="h-10 w-40" />
         <Skeleton className="h-32 w-full" />
         <Skeleton className="h-32 w-full" />
       </div>
     );
   }
 
   return (
     <div className="space-y-4">
       <div className="flex justify-between items-center">
         <h2 className="text-lg font-semibold">Kelola Changelog</h2>
         <Button onClick={handleCreate} disabled={isCreating}>
           <Plus className="h-4 w-4 mr-2" />
           Tambah Versi
         </Button>
       </div>
 
       {/* Create Form */}
       {isCreating && (
         <Card className="border-primary">
           <CardHeader>
             <CardTitle className="text-base">Tambah Entry Baru</CardTitle>
           </CardHeader>
           <CardContent>
             <ChangelogForm
               formData={formData}
               setFormData={setFormData}
               onSave={handleSave}
               onCancel={handleCancel}
               isLoading={createEntry.isPending}
               addChange={addChange}
               updateChange={updateChange}
               removeChange={removeChange}
             />
           </CardContent>
         </Card>
       )}
 
       {/* List */}
       {changelog.map((entry) => (
         <Card key={entry.id}>
           {editingId === entry.id ? (
             <CardContent className="pt-4">
               <ChangelogForm
                 formData={formData}
                 setFormData={setFormData}
                 onSave={handleSave}
                 onCancel={handleCancel}
                 isLoading={updateEntry.isPending}
                 addChange={addChange}
                 updateChange={updateChange}
                 removeChange={removeChange}
               />
             </CardContent>
           ) : (
             <>
               <CardHeader className="pb-2">
                 <div className="flex items-start justify-between">
                   <div>
                     <div className="flex items-center gap-2">
                       <span className="font-bold">v{entry.version}</span>
                       {entry.is_latest && (
                         <Badge className="bg-gradient-organic text-primary-foreground text-xs">
                           Terbaru
                         </Badge>
                       )}
                     </div>
                     <p className="font-medium text-sm">{entry.judul}</p>
                     <p className="text-xs text-muted-foreground">{entry.tanggal}</p>
                   </div>
                   <div className="flex gap-1">
                     <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                       <Pencil className="h-4 w-4" />
                     </Button>
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon">
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Hapus Entry?</AlertDialogTitle>
                           <AlertDialogDescription>
                             Apakah Anda yakin ingin menghapus changelog v{entry.version}?
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Batal</AlertDialogCancel>
                           <AlertDialogAction onClick={() => handleDelete(entry.id)}>
                             Hapus
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                   </div>
                 </div>
               </CardHeader>
               <CardContent>
                 <ul className="space-y-1">
                   {entry.changes.map((change, i) => (
                     <li key={i} className="flex items-center gap-2 text-sm">
                       {getTypeBadge(change.type)}
                       <span>{change.description}</span>
                     </li>
                   ))}
                 </ul>
               </CardContent>
             </>
           )}
         </Card>
       ))}
     </div>
   );
 };
 
 interface ChangelogFormProps {
   formData: ChangelogFormData;
   setFormData: (data: ChangelogFormData) => void;
   onSave: () => void;
   onCancel: () => void;
   isLoading: boolean;
   addChange: () => void;
   updateChange: (index: number, field: keyof ChangelogChange, value: string) => void;
   removeChange: (index: number) => void;
 }
 
 const ChangelogForm = ({
   formData,
   setFormData,
   onSave,
   onCancel,
   isLoading,
   addChange,
   updateChange,
   removeChange,
 }: ChangelogFormProps) => {
   return (
     <div className="space-y-4">
       <div className="grid grid-cols-2 gap-3">
         <div>
           <Label>Versi</Label>
           <Input
             value={formData.version}
             onChange={(e) => setFormData({ ...formData, version: e.target.value })}
             placeholder="1.4.0"
           />
         </div>
         <div>
           <Label>Tanggal</Label>
           <Input
             type="date"
             value={formData.tanggal}
             onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
           />
         </div>
       </div>
       <div>
         <Label>Judul</Label>
         <Input
           value={formData.judul}
           onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
           placeholder="Judul update"
         />
       </div>
       <div className="flex items-center gap-2">
         <Switch
           checked={formData.is_latest}
           onCheckedChange={(checked) => setFormData({ ...formData, is_latest: checked })}
         />
         <Label>Tandai sebagai versi terbaru</Label>
       </div>
 
       <div className="space-y-2">
         <div className="flex justify-between items-center">
           <Label>Perubahan</Label>
           <Button type="button" variant="outline" size="sm" onClick={addChange}>
             <Plus className="h-3 w-3 mr-1" />
             Tambah
           </Button>
         </div>
         {formData.changes.map((change, index) => (
           <div key={index} className="flex gap-2 items-start">
             <GripVertical className="h-4 w-4 mt-3 text-muted-foreground" />
             <Select
               value={change.type}
               onValueChange={(value) => updateChange(index, "type", value)}
             >
               <SelectTrigger className="w-32">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="feature">Fitur</SelectItem>
                 <SelectItem value="fix">Perbaikan</SelectItem>
                 <SelectItem value="improvement">Peningkatan</SelectItem>
                 <SelectItem value="breaking">Breaking</SelectItem>
               </SelectContent>
             </Select>
             <Input
               className="flex-1"
               value={change.description}
               onChange={(e) => updateChange(index, "description", e.target.value)}
               placeholder="Deskripsi perubahan"
             />
             <Button
               type="button"
               variant="ghost"
               size="icon"
               onClick={() => removeChange(index)}
             >
               <X className="h-4 w-4" />
             </Button>
           </div>
         ))}
       </div>
 
       <div className="flex justify-end gap-2 pt-2">
         <Button variant="outline" onClick={onCancel} disabled={isLoading}>
           Batal
         </Button>
         <Button onClick={onSave} disabled={isLoading}>
           <Save className="h-4 w-4 mr-2" />
           Simpan
         </Button>
       </div>
     </div>
   );
 };
 
 export default ChangelogManager;