/**
 * Product Code Generator for Traceability
 * 
 * Format: [KodePetani]-[DDMMYY]-[NoUrut]
 * Example: BN6-100226-001 (farmer BN6, date 10/02/2026, sequence 001)
 * 
 * Product codes uniquely identify each harvest/sale entry for traceability
 * throughout the supply chain (Barang Masuk → Barang Keluar → Penerimaan → Pengeringan).
 */

/**
 * Generate a product code from farmer code, date, and sequence number
 */
export const generateProductCode = (
  farmerCode: string,
  date: string,
  seq: number = 1
): string => {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${farmerCode}-${dd}${mm}${yy}-${String(seq).padStart(3, '0')}`;
};

/**
 * Parse a product code back into its components
 */
export const parseProductCode = (code: string): {
  farmerCode: string;
  date: string;
  seq: number;
} | null => {
  const match = code.match(/^(.+)-(\d{6})-(\d{3})$/);
  if (!match) return null;
  
  const [, farmerCode, dateStr, seqStr] = match;
  const dd = dateStr.substring(0, 2);
  const mm = dateStr.substring(2, 4);
  const yy = dateStr.substring(4, 6);
  
  return {
    farmerCode,
    date: `20${yy}-${mm}-${dd}`,
    seq: parseInt(seqStr),
  };
};

/**
 * Generate product codes for a farmer's daily entries
 * Returns array of { date, value, productCode } for entries with value > 0
 */
export const generateDailyProductCodes = (
  farmerCode: string,
  dailyData: { date: string; value: number }[]
): { date: string; value: number; productCode: string }[] => {
  let seq = 1;
  return dailyData
    .filter(d => d.value > 0)
    .map(d => ({
      date: d.date,
      value: d.value,
      productCode: generateProductCode(farmerCode, d.date, seq++),
    }));
};
