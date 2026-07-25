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

  // Client-side validation: uppercase alphanumeric, no spaces, 1–10 chars, unique.
  const PREFIX_FORMAT = /^[A-Z0-9]{1,10}$/;
  const validatePrefixInput = (
    code: string,
    name: string,
    excludeId?: string
  ): string | null => {
    const c = code.trim().toUpperCase();
    const n = name.trim();
    if (!c) return "Kode prefix wajib diisi";
    if (!n) return "Nama desa wajib diisi";
    if (/\s/.test(code)) return "Kode tidak boleh mengandung spasi";
    if (!PREFIX_FORMAT.test(c))
      return "Kode hanya boleh huruf besar/angka (1–10 karakter), tanpa spasi/simbol";
    const conflict = prefixes.find(
      (p) => p.code === c && p.id !== excludeId
    );
    if (conflict) return `Kode "${c}" sudah dipakai untuk desa "${conflict.name}"`;
    return null;
  };

  const addPrefix = async (code: string, name: string) => {
    const err = validatePrefixInput(code, name);
    if (err) {
      toast({ title: "Validasi gagal", description: err, variant: "destructive" });
      return false;
    }
    const c = code.trim().toUpperCase();
    const n = name.trim();
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
    const err = validatePrefixInput(code, name, id);
    if (err) {
      toast({ title: "Validasi gagal", description: err, variant: "destructive" });
      return false;
    }
    const c = code.trim().toUpperCase();
    const n = name.trim();
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
