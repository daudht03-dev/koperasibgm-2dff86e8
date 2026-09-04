/**
 * Offline queue for field staff.
 *
 * When there is no signal, coordinate updates and watermarked photos are
 * stored in IndexedDB and replayed automatically once the device is online.
 */
import { supabase } from "@/integrations/supabase/client";

const DB_NAME = "koperasi-offline";
const STORE = "queue";
const TILE_STORE = "map-tiles";
const MASTER_STORE = "master-data-cache";

export type QueueItem =
  | {
      id: string;
      kind: "land-coordinate";
      createdAt: number;
      payload: { landId: string; lat: number; lng: number; alamat?: string | null };
    }
  | {
      id: string;
      kind: "farmer-coordinate";
      createdAt: number;
      payload: { farmerId: string; lat: number; lng: number; alamat?: string | null };
    }
  | {
      id: string;
      kind: "photo";
      createdAt: number;
      payload: {
        blob: Blob;
        row: Record<string, unknown>;
        code: string;
        syncMaster?:
          | { type: "lahan"; id: string; lat: number; lng: number; alamat?: string | null }
          | { type: "petani"; id: string; lat: number; lng: number; alamat?: string | null }
          | null;
      };
    };

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 3);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(TILE_STORE)) db.createObjectStore(TILE_STORE);
      if (!db.objectStoreNames.contains(MASTER_STORE)) db.createObjectStore(MASTER_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const tx = async <T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const request = fn(t.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const enqueue = async (item: Omit<QueueItem, "id" | "createdAt"> & Partial<Pick<QueueItem, "id">>) => {
  const full = {
    id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    ...item,
  } as QueueItem;
  await tx(STORE, "readwrite", (s) => s.put(full));
  window.dispatchEvent(new CustomEvent("offline-queue-changed"));
  return full.id;
};

export const listQueue = async (): Promise<QueueItem[]> => {
  const items = await tx<QueueItem[]>(STORE, "readonly", (s) => s.getAll() as IDBRequest<QueueItem[]>);
  return (items || []).sort((a, b) => a.createdAt - b.createdAt);
};

export const removeItem = async (id: string) => {
  await tx(STORE, "readwrite", (s) => s.delete(id) as unknown as IDBRequest<undefined>);
  window.dispatchEvent(new CustomEvent("offline-queue-changed"));
};

/** Cache a static-map thumbnail so watermarks still work offline. */
export const cacheTile = async (key: string, dataUrl: string) => {
  try {
    await tx(TILE_STORE, "readwrite", (s) => s.put(dataUrl, key) as unknown as IDBRequest<undefined>);
  } catch {
    /* ignore */
  }
};

export const readTile = async (key: string): Promise<string | null> => {
  try {
    const v = await tx<string | undefined>(TILE_STORE, "readonly", (s) => s.get(key) as IDBRequest<string | undefined>);
    return v ?? null;
  } catch {
    return null;
  }
};

export const tileKey = (lat: number, lng: number, zoom: number) =>
  `${lat.toFixed(4)},${lng.toFixed(4)}@${zoom}`;

export interface MasterDataCache {
  petani: unknown[];
  lahan: unknown[];
  villages: unknown[];
  cachedAt: number;
}

/** Cache master reference data (farmers / lands / villages) for offline use. */
export const cacheMasterData = async (data: { petani: unknown[]; lahan: unknown[]; villages: unknown[] }) => {
  try {
    const entry: MasterDataCache = { ...data, cachedAt: Date.now() };
    await tx(MASTER_STORE, "readwrite", (s) => s.put(entry, "master") as unknown as IDBRequest<undefined>);
  } catch {
    /* ignore */
  }
};

export const readMasterData = async (): Promise<MasterDataCache | null> => {
  try {
    const v = await tx<MasterDataCache | undefined>(MASTER_STORE, "readonly", (s) => s.get("master") as IDBRequest<MasterDataCache | undefined>);
    return v ?? null;
  } catch {
    return null;
  }
};

const syncMasterRecord = async (sync: NonNullable<Extract<QueueItem, { kind: "photo" }>["payload"]["syncMaster"]>) => {
  if (sync.type === "lahan") {
    await supabase
      .from("lahan")
      .update({ koordinat: `${sync.lat.toFixed(6)}, ${sync.lng.toFixed(6)}`, lokasi: sync.alamat || null })
      .eq("id", sync.id);
  } else {
    await supabase
      .from("petani")
      .update({ koordinat_lat: sync.lat, koordinat_lng: sync.lng, alamat_rumah: sync.alamat || null })
      .eq("id", sync.id);
  }
};

const processItem = async (item: QueueItem) => {
  if (item.kind === "land-coordinate") {
    const { error } = await supabase
      .from("lahan")
      .update({
        koordinat: `${item.payload.lat.toFixed(6)}, ${item.payload.lng.toFixed(6)}`,
        ...(item.payload.alamat ? { lokasi: item.payload.alamat } : {}),
      })
      .eq("id", item.payload.landId);
    if (error) throw error;
    return;
  }

  if (item.kind === "farmer-coordinate") {
    const { error } = await supabase
      .from("petani")
      .update({
        koordinat_lat: item.payload.lat,
        koordinat_lng: item.payload.lng,
        ...(item.payload.alamat ? { alamat_rumah: item.payload.alamat } : {}),
      })
      .eq("id", item.payload.farmerId);
    if (error) throw error;
    return;
  }

  // photo
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  const safeCode = (item.payload.code || "foto").replace(/[^A-Za-z0-9_-]/g, "");
  const path = `${uid}/${safeCode}-${item.createdAt}.jpg`;
  const { error: upErr } = await supabase.storage
    .from("foto-lahan")
    .upload(path, item.payload.blob, { contentType: "image/jpeg", upsert: true });
  if (upErr) throw upErr;
  const { data: signed } = await supabase.storage.from("foto-lahan").createSignedUrl(path, 60 * 60 * 24 * 365);
  const { error: insErr } = await supabase.from("foto_lahan").insert({
    ...(item.payload.row as any),
    file_path: path,
    file_url: signed?.signedUrl || path,
    created_by: uid ?? null,
  });
  if (insErr) throw insErr;
  if (item.payload.syncMaster) await syncMasterRecord(item.payload.syncMaster);
};

/** Replay every queued item. Returns how many succeeded / failed. */
export const flushQueue = async (): Promise<{ synced: number; failed: number }> => {
  if (!navigator.onLine) return { synced: 0, failed: 0 };
  const items = await listQueue();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await processItem(item);
      await removeItem(item.id);
      synced++;
    } catch (e) {
      console.error("offline queue item failed", item.kind, e);
      failed++;
    }
  }
  return { synced, failed };
};
