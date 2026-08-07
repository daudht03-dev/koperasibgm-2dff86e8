/**
 * Coordinate validation & accuracy scoring.
 *
 * Produces a 0-100 score plus human readable issues so field staff can spot
 * a mistyped / stale / inconsistent coordinate before it is saved.
 */

export type AccuracyLevel = "tinggi" | "sedang" | "rendah" | "invalid";

export interface AccuracyInput {
  lat: number | null | undefined;
  lng: number | null | undefined;
  /** GPS reported accuracy radius in meters (navigator.geolocation) */
  gpsAccuracyMeters?: number | null;
  /** Reverse-geocoded address for the coordinate */
  geocodedAddress?: string | null;
  /** Village / area name expected from the code prefix mapping */
  expectedVillage?: string | null;
  /** Address typed / stored by the operator */
  enteredAddress?: string | null;
  /** Reference point (farmer home / other land) to sanity-check distance */
  referencePoint?: { lat: number; lng: number; label?: string } | null;
  /** Max plausible distance from reference (km) before we warn */
  maxReferenceKm?: number;
}

export interface AccuracyResult {
  score: number;
  level: AccuracyLevel;
  issues: string[];
  notes: string[];
  /** Combined note string persisted with the photo */
  summary: string;
  valid: boolean;
}

/** Rough bounding box for Indonesia */
const ID_BOUNDS = { minLat: -11.5, maxLat: 6.5, minLng: 94.5, maxLng: 141.5 };

export const distanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

const normalize = (v: string) =>
  v
    .toLowerCase()
    .replace(/desa|kelurahan|kecamatan|kabupaten|kab\.|kota|prov\.|provinsi/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Does the geocoded address mention the expected village? */
export const addressMentionsVillage = (address?: string | null, village?: string | null) => {
  if (!address || !village) return null;
  const a = normalize(address);
  const tokens = normalize(village).split(" ").filter((t) => t.length >= 4);
  if (!tokens.length) return null;
  return tokens.some((t) => a.includes(t));
};

export function evaluateCoordinate(input: AccuracyInput): AccuracyResult {
  const issues: string[] = [];
  const notes: string[] = [];
  const { lat, lng } = input;

  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return {
      score: 0,
      level: "invalid",
      issues: ["Koordinat belum diisi atau bukan angka."],
      notes: [],
      summary: "Koordinat belum valid",
      valid: false,
    };
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      score: 0,
      level: "invalid",
      issues: ["Koordinat di luar rentang bumi (lat -90..90, long -180..180)."],
      notes: [],
      summary: "Koordinat di luar rentang",
      valid: false,
    };
  }

  let score = 100;

  if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) {
    issues.push("Koordinat 0,0 — kemungkinan GPS gagal.");
    score -= 60;
  }

  const insideID =
    lat >= ID_BOUNDS.minLat && lat <= ID_BOUNDS.maxLat && lng >= ID_BOUNDS.minLng && lng <= ID_BOUNDS.maxLng;
  if (!insideID) {
    issues.push("Titik berada di luar wilayah Indonesia — cek kemungkinan lat/long tertukar.");
    score -= 40;
  }

  // Decimal precision: fewer than 4 decimals ≈ >10 m error
  const decimals = (v: number) => (String(v).split(".")[1] || "").length;
  const minDec = Math.min(decimals(lat), decimals(lng));
  if (minDec < 4) {
    issues.push(`Presisi desimal rendah (${minDec} digit) — minimal 5 digit disarankan.`);
    score -= 20;
  } else if (minDec < 5) {
    notes.push("Presisi desimal cukup, 6 digit lebih ideal.");
    score -= 5;
  }

  const acc = input.gpsAccuracyMeters;
  if (acc != null && Number.isFinite(acc)) {
    if (acc <= 10) notes.push(`Akurasi GPS ±${Math.round(acc)} m (sangat baik).`);
    else if (acc <= 30) {
      notes.push(`Akurasi GPS ±${Math.round(acc)} m (baik).`);
      score -= 5;
    } else if (acc <= 100) {
      issues.push(`Akurasi GPS ±${Math.round(acc)} m — tunggu sinyal lebih stabil.`);
      score -= 20;
    } else {
      issues.push(`Akurasi GPS ±${Math.round(acc)} m — terlalu lebar, ambil ulang di area terbuka.`);
      score -= 35;
    }
  } else {
    notes.push("Akurasi GPS tidak diketahui (koordinat manual).");
    score -= 10;
  }

  const villageMatch = addressMentionsVillage(input.geocodedAddress, input.expectedVillage);
  if (villageMatch === true) {
    notes.push(`Alamat geocoding cocok dengan desa ${input.expectedVillage}.`);
  } else if (villageMatch === false) {
    issues.push(
      `Alamat hasil geocoding tidak menyebut desa ${input.expectedVillage} — periksa titik atau kode lahan.`,
    );
    score -= 25;
  }

  if (input.geocodedAddress && input.enteredAddress) {
    const a = normalize(input.geocodedAddress);
    const b = normalize(input.enteredAddress);
    const shared = b.split(" ").filter((t) => t.length >= 4 && a.includes(t));
    if (!shared.length) {
      issues.push("Alamat yang diketik tidak mirip dengan alamat hasil geocoding.");
      score -= 10;
    }
  } else if (!input.geocodedAddress) {
    notes.push("Belum ada verifikasi alamat dari geocoding.");
    score -= 10;
  }

  const ref = input.referencePoint;
  if (ref) {
    const d = distanceKm(lat, lng, ref.lat, ref.lng);
    const max = input.maxReferenceKm ?? 15;
    if (d > max) {
      issues.push(
        `Jarak ${d.toFixed(1)} km dari ${ref.label || "titik referensi"} — jauh melebihi batas wajar (${max} km).`,
      );
      score -= 25;
    } else {
      notes.push(`Jarak ${d.toFixed(2)} km dari ${ref.label || "titik referensi"}.`);
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: AccuracyLevel = score >= 80 ? "tinggi" : score >= 55 ? "sedang" : "rendah";

  return {
    score,
    level,
    issues,
    notes,
    summary: [`Skor akurasi ${score}/100 (${level})`, ...issues].join(" | "),
    valid: score > 0,
  };
}

export const accuracyColor = (level: AccuracyLevel) =>
  level === "tinggi"
    ? "text-emerald-600 border-emerald-500"
    : level === "sedang"
      ? "text-amber-600 border-amber-500"
      : "text-destructive border-destructive";
