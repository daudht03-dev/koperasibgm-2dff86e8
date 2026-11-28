import { expect, test } from "bun:test";
import { canManageDocuments, documentMetadata } from "./document-photo";

test("existing document writers can manage documents", () => {
  for (const role of ["admin", "developer", "staf_lapang"]) expect(canManageDocuments([role])).toBe(true);
  for (const role of ["pengawas", "auditor", "user", "moderator"]) expect(canManageDocuments([role])).toBe(false);
  expect(canManageDocuments([])).toBe(false);
});

test("document corrections use the chosen farmer and never carry location data", () => {
  expect(documentMetadata({ id: "farmer-2", nama: "Petani Uji", kode_petani: "PK2" }, " Foto KTP ", "2026-11-28T02:45:00.000Z", false)).toEqual({
    petani_id: "farmer-2", nama_petani: "Petani Uji", kode: "PK2", catatan: "Foto KTP",
    taken_at: "2026-11-28T02:45:00.000Z", tampilkan_waktu: false,
    lahan_id: null, judul: null, alamat: null, koordinat_lat: null, koordinat_lng: null,
    akurasi_meter: null, akurasi_skor: null, akurasi_catatan: null,
  });
});