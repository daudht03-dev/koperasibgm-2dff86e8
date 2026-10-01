/**
 * Universal form draft store.
 *
 * Drafts live in the "form-drafts" object store of the existing
 * "koperasi-offline" IndexedDB database (see offline-queue.ts), keyed by a
 * caller-chosen string (e.g. "form:tambah-petani"). Values are stored as
 * { data, savedAt } records.
 */
import { openDb, tx, DRAFT_STORE } from "./offline-queue";

export interface DraftRecord {
  data: unknown;
  savedAt: number;
}

export interface DraftSummary {
  key: string;
  savedAt: number;
}

export const saveDraft = async (key: string, data: unknown): Promise<void> => {
  const record: DraftRecord = { data, savedAt: Date.now() };
  await tx(DRAFT_STORE, "readwrite", (s) => s.put(record, key));
};

export const getDraft = async (key: string): Promise<DraftRecord | null> => {
  const record = await tx<DraftRecord | undefined>(DRAFT_STORE, "readonly", (s) => s.get(key) as IDBRequest<DraftRecord | undefined>);
  return record ?? null;
};

export const clearDraft = async (key: string): Promise<void> => {
  await tx(DRAFT_STORE, "readwrite", (s) => s.delete(key));
};

export const listDrafts = async (): Promise<DraftSummary[]> => {
  const db = await openDb();
  return new Promise<DraftSummary[]>((resolve, reject) => {
    const t = db.transaction(DRAFT_STORE, "readonly");
    const store = t.objectStore(DRAFT_STORE);
    const results: DraftSummary[] = [];
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) {
        resolve(results);
        return;
      }
      const value = cursor.value as DraftRecord | undefined;
      results.push({ key: String(cursor.key), savedAt: value?.savedAt ?? 0 });
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
};
