/** Keep sensitive identity photos under a dedicated private-storage prefix. */
export const buildPhotoPath = (tipe: string, uid: string, code: string, timestamp = Date.now()): string => {
  const safeCode = (code || "foto").replace(/[^A-Za-z0-9_-]/g, "");
  return `${tipe === "ktp" ? "ktp/" : ""}${uid}/${safeCode}-${timestamp}.jpg`;
};

/** Never mint or persist a long-lived signed URL for a KTP photo. */
export const resolvePhotoFileUrl = async (
  tipe: string,
  path: string,
  sign: () => Promise<string | null | undefined>,
): Promise<string> => {
  if (tipe === "ktp") return path;
  return (await sign()) || path;
};