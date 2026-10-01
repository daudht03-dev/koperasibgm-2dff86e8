import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraft, getDraft, clearDraft as clearDraftFromStore } from "@/lib/draft-store";

const AUTOSAVE_DEBOUNCE_MS = 1000;

export interface UseDraftFormResult<T> {
  values: T;
  setValues: React.Dispatch<React.SetStateAction<T>>;
  clearDraft: () => Promise<void>;
  hasDraftAvailable: boolean;
  restoreDraft: () => void;
  savedAt: number | null;
}

/**
 * Universal draft-form hook.
 *
 * - Auto-saves `values` to the draft store (debounced 1s) on every change.
 * - On mount, checks for an existing draft: sets `hasDraftAvailable` and
 *   `savedAt`, but does NOT overwrite `initialValues` until the user calls
 *   `restoreDraft()`.
 */
export function useDraftForm<T>(key: string, initialValues: T): UseDraftFormResult<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [hasDraftAvailable, setHasDraftAvailable] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const pendingDraftRef = useRef<T | null>(null);
  const skipNextSaveRef = useRef(false);

  // Check for an existing draft on mount (per key).
  useEffect(() => {
    let cancelled = false;
    void getDraft(key).then((draft) => {
      if (cancelled || !draft) return;
      pendingDraftRef.current = draft.data as T;
      setHasDraftAvailable(true);
      setSavedAt(draft.savedAt);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  // Debounced auto-save on every values change.
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void saveDraft(key, values).then(() => setSavedAt(Date.now()));
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [key, values]);

  const restoreDraft = useCallback(() => {
    if (pendingDraftRef.current == null) return;
    skipNextSaveRef.current = false; // restored values should be auto-saved too
    setValues(pendingDraftRef.current);
    setHasDraftAvailable(false);
  }, []);

  const clearDraft = useCallback(async () => {
    skipNextSaveRef.current = true;
    pendingDraftRef.current = null;
    setHasDraftAvailable(false);
    setSavedAt(null);
    await clearDraftFromStore(key);
  }, [key]);

  return { values, setValues, clearDraft, hasDraftAvailable, restoreDraft, savedAt };
}
