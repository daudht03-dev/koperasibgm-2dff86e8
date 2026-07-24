import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface VillagePrefix {
  id: string;
  code: string;
  name: string;
}

export const useVillagePrefixes = () => {
  const [prefixes, setPrefixes] = useState<VillagePrefix[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrefixes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("village_prefixes")
      .select("id, code, name")
      .order("code", { ascending: true });
    if (error) {
      console.error("village_prefixes fetch error", error);
      toast({ title: "Gagal", description: "Gagal memuat mapping desa", variant: "destructive" });
    } else {
      setPrefixes(data || []);
    }
    setLoading(false);
  }, []);

  const addPrefix = async (code: string, name: string) => {
    const c = code.trim().toUpperCase();
    const n = name.trim();
    if (!c || !n) return false;
    const { error } = await supabase.from("village_prefixes").insert({ code: c, name: n });
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Berhasil", description: `Mapping ${c} → ${n} ditambahkan` });
    await fetchPrefixes();
    return true;
  };

  const updatePrefix = async (id: string, code: string, name: string) => {
    const c = code.trim().toUpperCase();
    const n = name.trim();
    if (!c || !n) return false;
    const { error } = await supabase.from("village_prefixes").update({ code: c, name: n }).eq("id", id);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Berhasil", description: "Mapping diperbarui" });
    await fetchPrefixes();
    return true;
  };

  const deletePrefix = async (id: string) => {
    const { error } = await supabase.from("village_prefixes").delete().eq("id", id);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "Berhasil", description: "Mapping dihapus" });
    await fetchPrefixes();
    return true;
  };

  useEffect(() => {
    fetchPrefixes();
  }, [fetchPrefixes]);

  // Map lookup by code (uppercase)
  const nameByCode = (code: string | null | undefined): string => {
    if (!code) return "-";
    const found = prefixes.find((p) => p.code === code.toUpperCase());
    return found?.name || code;
  };

  const map: Record<string, string> = Object.fromEntries(prefixes.map((p) => [p.code, p.name]));

  return { prefixes, loading, addPrefix, updatePrefix, deletePrefix, refetch: fetchPrefixes, nameByCode, map };
};
