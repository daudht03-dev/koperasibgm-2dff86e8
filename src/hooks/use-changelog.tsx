 import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
 import { supabase } from "@/integrations/supabase/client";
 import { useToast } from "@/hooks/use-toast";
 
 export interface ChangelogChange {
   type: "feature" | "fix" | "improvement" | "breaking";
   description: string;
 }
 
 export interface ChangelogEntry {
   id: string;
   version: string;
   tanggal: string;
   judul: string;
   is_latest: boolean;
   changes: ChangelogChange[];
   created_at: string;
   updated_at: string;
 }
 
 export const useChangelog = () => {
   const { toast } = useToast();
   const queryClient = useQueryClient();
 
   const { data: changelog = [], isLoading, error } = useQuery({
     queryKey: ["changelog"],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("changelog")
         .select("*")
         .order("tanggal", { ascending: false });
 
       if (error) throw error;
       return data as unknown as ChangelogEntry[];
     },
   });
 
   const createEntry = useMutation({
     mutationFn: async (entry: Omit<ChangelogEntry, "id" | "created_at" | "updated_at">) => {
       // If this is the latest, unset other latest entries
       if (entry.is_latest) {
         await supabase
           .from("changelog")
           .update({ is_latest: false })
           .eq("is_latest", true);
       }
 
       const insertData = {
         version: entry.version,
         tanggal: entry.tanggal,
         judul: entry.judul,
         is_latest: entry.is_latest,
         changes: JSON.parse(JSON.stringify(entry.changes)),
       };
       const { data, error } = await supabase
         .from("changelog")
         .insert(insertData)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["changelog"] });
       toast({ title: "Berhasil", description: "Entry changelog berhasil ditambahkan" });
     },
     onError: (error) => {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     },
   });
 
   const updateEntry = useMutation({
     mutationFn: async ({ id, ...entry }: Partial<ChangelogEntry> & { id: string }) => {
       // If setting this as latest, unset other latest entries
       if (entry.is_latest) {
         await supabase
           .from("changelog")
           .update({ is_latest: false })
           .neq("id", id);
       }
 
       const updateData: Record<string, unknown> = {};
       if (entry.version !== undefined) updateData.version = entry.version;
       if (entry.tanggal !== undefined) updateData.tanggal = entry.tanggal;
       if (entry.judul !== undefined) updateData.judul = entry.judul;
       if (entry.is_latest !== undefined) updateData.is_latest = entry.is_latest;
       if (entry.changes !== undefined) updateData.changes = JSON.parse(JSON.stringify(entry.changes));
 
       const { data, error } = await supabase
         .from("changelog")
         .update(updateData)
         .eq("id", id)
         .select()
         .single();
 
       if (error) throw error;
       return data;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["changelog"] });
       toast({ title: "Berhasil", description: "Entry changelog berhasil diupdate" });
     },
     onError: (error) => {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     },
   });
 
   const deleteEntry = useMutation({
     mutationFn: async (id: string) => {
       const { error } = await supabase.from("changelog").delete().eq("id", id);
       if (error) throw error;
     },
     onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["changelog"] });
       toast({ title: "Berhasil", description: "Entry changelog berhasil dihapus" });
     },
     onError: (error) => {
       toast({ title: "Error", description: error.message, variant: "destructive" });
     },
   });
 
   return {
     changelog,
     isLoading,
     error,
     createEntry,
     updateEntry,
     deleteEntry,
   };
 };