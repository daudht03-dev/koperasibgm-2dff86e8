export type DocumentPhotoType = "ktp" | "pelatihan";

export interface DocumentPhoto {
  id: string;
  tipe: DocumentPhotoType;
  petani_id: string | null;
  kode: string | null;
  nama_petani: string | null;
  catatan: string | null;
  tampilkan_waktu: boolean;
  file_path: string;
  taken_at: string;
  url?: string;
}

export const canManageDocuments = (roles: readonly string[]) =>
  roles.some((role) => ["admin", "developer", "staf_lapang"].includes(role));

export const documentMetadata = (
  farmer: { id: string; nama: string; kode_petani: string },
  note: string,
  takenAt: string,
  showTime: boolean,
) => ({
  petani_id: farmer.id,
  nama_petani: farmer.nama,
  kode: farmer.kode_petani,
  catatan: note.trim() || null,
  taken_at: takenAt,
  tampilkan_waktu: showTime,
  lahan_id: null,
  judul: null,
  alamat: null,
  koordinat_lat: null,
  koordinat_lng: null,
  akurasi_meter: null,
  akurasi_skor: null,
  akurasi_catatan: null,
});