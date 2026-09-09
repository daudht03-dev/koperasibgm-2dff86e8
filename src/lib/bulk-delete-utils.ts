import { supabase } from "@/integrations/supabase/client";

const CHUNK = 100;

/** Splits ids so `in` filters never build an overly long URL. */
export const chunked = <T,>(arr: T[]): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
  return out;
};

export const countBy = async (
  table: string,
  column: string,
  ids: string[]
): Promise<number> => {
  if (ids.length === 0) return 0;
  let total = 0;
  for (const part of chunked(ids)) {
    const { count, error } = await (supabase as any)
      .from(table)
      .select("id", { count: "exact", head: true })
      .in(column, part);
    if (error) throw error;
    total += count ?? 0;
  }
  return total;
};

export const fetchRows = async (
  table: string,
  column: string,
  ids: string[]
): Promise<any[]> => {
  if (ids.length === 0) return [];
  const rows: any[] = [];
  for (const part of chunked(ids)) {
    const { data, error } = await (supabase as any).from(table).select("*").in(column, part);
    if (error) throw error;
    rows.push(...(data ?? []));
  }
  return rows;
};

export const toCsv = (rows: any[]): string => {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );
  const escape = (value: any) => {
    if (value === null || value === undefined) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const timestampSuffix = () =>
  new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
