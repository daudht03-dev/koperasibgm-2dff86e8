/**
 * Approved Farmer List (AFL) export.
 * Bundles a full farmer + land dataset (CSV) together with every stored photo
 * attachment in a single ZIP, including a photo-link column per row.
 */
import JSZip from "jszip";
import { EntityPhoto, photoFileName } from "@/hooks/use-entity-photos";

type AnyRow = Record<string, any>;

const csvEscape = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const toCsv = (headers: string[], rows: (string | number | null | undefined)[][]) =>
  "\uFEFF" + [headers, ...rows].map((r) => r.map(csvEscape).join(";")).join("\n");

const naturalSort = (a: string, b: string) =>
  (a || "").localeCompare(b || "", undefined, { numeric: true, sensitivity: "base" });

export interface AFLOptions {
  farmers: AnyRow[];
  lands: AnyRow[];
  photos: EntityPhoto[];
  includePhotoFiles?: boolean;
  onProgress?: (done: number, total: number) => void;
}

export const exportAFL = async ({
  farmers,
  lands,
  photos,
  includePhotoFiles = true,
  onProgress,
}: AFLOptions) => {
  const zip = new JSZip();
  const folderName = `AFL-${new Date().toISOString().slice(0, 10)}`;
  const root = zip.folder(folderName)!;
  const photoDir = root.folder("foto")!;

  const byFarmer: Record<string, EntityPhoto[]> = {};
  const byLand: Record<string, EntityPhoto[]> = {};
  photos.forEach((p) => {
    if (p.petani_id) (byFarmer[p.petani_id] ||= []).push(p);
    if (p.lahan_id) (byLand[p.lahan_id] ||= []).push(p);
  });

  const sortedFarmers = [...farmers].sort((a, b) => naturalSort(a.kode_petani, b.kode_petani));
  const farmerById = new Map(sortedFarmers.map((f) => [f.id, f]));

  const linkList = (list: EntityPhoto[] = []) =>
    list.map((p) => p.url || "").filter(Boolean).join(" | ");
  const fileList = (list: EntityPhoto[] = []) =>
    list.map((p) => `foto/${photoFileName(p)}`).join(" | ");

  // --- Farmers sheet ---
  const farmerHeaders = [
    "Kode Petani",
    "Nama",
    "Alamat",
    "Alamat Rumah",
    "No Telepon",
    "Status",
    "Organik",
    "Regulasi",
    "Latitude Rumah",
    "Longitude Rumah",
    "Rata-rata Panen (kg)",
    "Tanggal Bergabung",
    "Jumlah Lahan",
    "Jumlah Foto",
    "File Foto (dalam ZIP)",
    "Link Foto",
  ];
  const farmerRows = sortedFarmers.map((f) => {
    const list = byFarmer[f.id] || [];
    const landCount = lands.filter((l) => l.petani_id === f.id).length;
    return [
      f.kode_petani,
      f.nama,
      f.alamat ?? "",
      f.alamat_rumah ?? "",
      f.no_telepon ?? "",
      f.status ?? "",
      f.is_organic ? "Organik" : "Konvensional",
      f.regulasi ?? "",
      f.koordinat_lat ?? "",
      f.koordinat_lng ?? "",
      f.rata_rata_panen ?? "",
      f.tanggal_bergabung ?? "",
      landCount,
      list.length,
      fileList(list),
      linkList(list),
    ];
  });

  // --- Lands sheet ---
  const landHeaders = [
    "Kode Petani",
    "Nama Petani",
    "Nama Lahan",
    "Luas (ha)",
    "Lokasi",
    "Koordinat",
    "Jenis Tanah",
    "Status",
    "Organik",
    "Jumlah Foto",
    "File Foto (dalam ZIP)",
    "Link Foto",
  ];
  const landRows = [...lands]
    .sort((a, b) => naturalSort(a.nama_lahan, b.nama_lahan))
    .map((l) => {
      const f = farmerById.get(l.petani_id);
      const list = byLand[l.id] || [];
      return [
        f?.kode_petani ?? "",
        f?.nama ?? "",
        l.nama_lahan,
        l.luas ?? "",
        l.lokasi ?? "",
        l.koordinat ?? "",
        l.jenis_tanah ?? "",
        l.status ?? "",
        (l.is_organic ?? f?.is_organic) ? "Organik" : "Konvensional",
        list.length,
        fileList(list),
        linkList(list),
      ];
    });

  root.file("AFL-Petani.csv", toCsv(farmerHeaders, farmerRows));
  root.file("AFL-Lahan.csv", toCsv(landHeaders, landRows));
  root.file(
    "README.txt",
    [
      "Approved Farmer List (AFL)",
      `Dibuat: ${new Date().toLocaleString("id-ID")}`,
      `Jumlah petani: ${sortedFarmers.length}`,
      `Jumlah lahan: ${lands.length}`,
      `Jumlah foto: ${photos.length}`,
      "",
      "Isi paket:",
      "- AFL-Petani.csv : identitas lengkap petani terdaftar + kolom link foto",
      "- AFL-Lahan.csv  : data lahan per petani + kolom link foto",
      "- foto/          : lampiran foto (watermark GPS) sesuai kolom 'File Foto'",
      "",
      "Catatan: kolom 'Link Foto' berisi tautan bertanda tangan yang kedaluwarsa dalam 1 jam.",
      "Gunakan berkas di folder foto/ untuk arsip permanen.",
    ].join("\n"),
  );

  if (includePhotoFiles) {
    const withUrl = photos.filter((p) => p.url);
    let done = 0;
    for (const p of withUrl) {
      try {
        const res = await fetch(p.url!);
        if (res.ok) photoDir.file(photoFileName(p), await res.blob());
      } catch {
        /* skip unreachable file */
      }
      onProgress?.(++done, withUrl.length);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `${folderName}.zip`;
  a.click();
  URL.revokeObjectURL(objectUrl);
};
