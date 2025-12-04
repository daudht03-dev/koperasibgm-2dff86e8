import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";

type LabelSettings = Tables<"label_settings">;
type LabelSettingsInsert = TablesInsert<"label_settings">;
type LabelSettingsUpdate = TablesUpdate<"label_settings">;

export const useLabelSettings = () => {
  const [labelSettings, setLabelSettings] = useState<LabelSettings[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLabelSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("label_settings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching label settings:", error);
        toast({
          title: "Error",
          description: "Gagal memuat pengaturan label",
          variant: "destructive",
        });
        return;
      }

      setLabelSettings(data || []);
    } catch (error) {
      console.error("Error fetching label settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getLabelSettingByFarmerId = async (farmerId: string) => {
    try {
      const { data, error } = await supabase
        .from("label_settings")
        .select("*")
        .eq("petani_id", farmerId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching label setting:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error fetching label setting:", error);
      return null;
    }
  };

  const upsertLabelSetting = async (settings: LabelSettingsInsert) => {
    try {
      const { data, error } = await supabase
        .from("label_settings")
        .upsert(settings, { onConflict: "petani_id" })
        .select()
        .single();

      if (error) {
        console.error("Error upserting label setting:", error);
        toast({
          title: "Error",
          description: "Gagal menyimpan pengaturan label",
          variant: "destructive",
        });
        return false;
      }

      await fetchLabelSettings();
      toast({
        title: "Berhasil",
        description: "Pengaturan label berhasil disimpan",
      });
      return true;
    } catch (error) {
      console.error("Error upserting label setting:", error);
      return false;
    }
  };

  const deleteLabelSetting = async (id: string) => {
    try {
      const { error } = await supabase
        .from("label_settings")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Error deleting label setting:", error);
        toast({
          title: "Error",
          description: "Gagal menghapus pengaturan label",
          variant: "destructive",
        });
        return false;
      }

      await fetchLabelSettings();
      toast({
        title: "Berhasil",
        description: "Pengaturan label berhasil dihapus",
      });
      return true;
    } catch (error) {
      console.error("Error deleting label setting:", error);
      return false;
    }
  };

  useEffect(() => {
    fetchLabelSettings();
  }, []);

  return {
    labelSettings,
    loading,
    getLabelSettingByFarmerId,
    upsertLabelSetting,
    deleteLabelSetting,
    refetch: fetchLabelSettings,
  };
};

export type { LabelSettings };
