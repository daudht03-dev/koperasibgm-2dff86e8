/**
 * Loads GPS-watermarked land/home photos and indexes them per farmer & per land,
 * complete with short-lived signed URLs for thumbnails and downloads.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EntityPhoto {
  id: string;
  tipe: string;
  kode: string | null;
  nama_petani: string | null;
  judul: string | null;
  petani_id: string | null;
  lahan_id: string | null;
  file_path: string;
  taken_at: string;
  url?: string;
}

export const photoFileName = (p: EntityPhoto) =>
  `${(p.kode || p.nama_petani || "foto").replace(/[^A-Za-z0-9_-]/g, "_")}-${new Date(p.taken_at)
    .toISOString()
    .slice(0, 10)}-${p.id.slice(0, 6)}.jpg`;

export const useEntityPhotos = (enabled = true) => {
  const [photos, setPhotos] = useState<EntityPhoto[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("foto_lahan")
      .select("id,tipe,kode,nama_petani,judul,petani_id,lahan_id,file_path,taken_at")
      .order("taken_at", { ascending: false })
      .limit(5000);
    if (error || !data) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    const rows = data as EntityPhoto[];
    if (rows.length) {
      const { data: signed } = await supabase.storage
        .from("foto-lahan")
        .createSignedUrls(rows.map((r) => r.file_path), 60 * 60);
      (signed || []).forEach((s, i) => {
        if (s.signedUrl) rows[i].url = s.signedUrl;
      });
    }
    setPhotos(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchPhotos();
    const channel = supabase
      .channel("entity-photos-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "foto_lahan" }, () => {
        fetchPhotos();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchPhotos]);

  const byFarmer = useMemo(() => {
    const m: Record<string, EntityPhoto[]> = {};
    photos.forEach((p) => {
      if (!p.petani_id) return;
      (m[p.petani_id] ||= []).push(p);
    });
    return m;
  }, [photos]);

  const byLand = useMemo(() => {
    const m: Record<string, EntityPhoto[]> = {};
    photos.forEach((p) => {
      if (!p.lahan_id) return;
      (m[p.lahan_id] ||= []).push(p);
    });
    return m;
  }, [photos]);

  return { photos, byFarmer, byLand, loading, refetch: fetchPhotos };
};
