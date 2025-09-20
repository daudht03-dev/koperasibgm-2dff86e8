import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type Content = Tables<"konten_website">;
type ContentInsert = TablesInsert<"konten_website">;
type ContentUpdate = TablesUpdate<"konten_website">;

export const useContent = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("konten_website")
        .select("*")
        .order("section", { ascending: true });

      if (error) {
        console.error("Error fetching contents:", error);
        toast({
          title: "Error",
          description: "Gagal memuat data konten",
          variant: "destructive",
        });
        return;
      }

      setContents(data || []);
    } catch (error) {
      console.error("Error fetching contents:", error);
      toast({
        title: "Error",
        description: "Gagal memuat data konten",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addContent = async (content: ContentInsert) => {
    try {
      const { data, error } = await supabase
        .from("konten_website")
        .insert(content)
        .select()
        .single();

      if (error) {
        console.error("Error adding content:", error);
        toast({
          title: "Error",
          description: "Gagal menambahkan konten",
          variant: "destructive",
        });
        return false;
      }

      setContents(prev => [...prev, data]);
      toast({
        title: "Berhasil",
        description: "Konten berhasil ditambahkan",
      });
      return true;
    } catch (error) {
      console.error("Error adding content:", error);
      toast({
        title: "Error",
        description: "Gagal menambahkan konten",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateContent = async (id: string, content: ContentUpdate) => {
    try {
      const { data, error } = await supabase
        .from("konten_website")
        .update(content)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating content:", error);
        toast({
          title: "Error",
          description: "Gagal mengupdate konten",
          variant: "destructive",
        });
        return false;
      }

      setContents(prev => prev.map(c => c.id === id ? data : c));
      toast({
        title: "Berhasil",
        description: "Konten berhasil diupdate",
      });
      return true;
    } catch (error) {
      console.error("Error updating content:", error);
      toast({
        title: "Error",
        description: "Gagal mengupdate konten",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteContent = async (id: string) => {
    try {
      const { error } = await supabase
        .from("konten_website")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting content:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus konten",
          variant: "destructive",
        });
        return false;
      }

      setContents(prev => prev.filter(c => c.id !== id));
      toast({
        title: "Berhasil",
        description: "Konten berhasil dihapus",
      });
      return true;
    } catch (error) {
      console.error("Error deleting content:", error);
      toast({
        title: "Error",
        description: "Gagal menghapus konten",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchContents();
  }, []);

  return {
    contents,
    loading,
    addContent,
    updateContent,
    deleteContent,
    refetch: fetchContents,
  };
};