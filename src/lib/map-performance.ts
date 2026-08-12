/**
 * Automatic map performance tuning.
 *
 * Marker detail is degraded automatically as the number of rendered points
 * grows, so field staff and auditors never have to flip a toggle manually.
 */
export type DetailLevel = "full" | "medium" | "low" | "minimal";

export interface MapDetail {
  level: DetailLevel;
  /** Render per-marker text labels (codes). */
  showLabels: boolean;
  /** Group markers into clusters. */
  cluster: boolean;
  /** Marker circle radius. */
  scale: number;
  /** Outline width; 0 keeps rendering cheap. */
  strokeWeight: number;
  /** Let Google rasterise markers into a single layer. */
  optimized: boolean;
  /** Suggest a heatmap instead of individual markers. */
  preferHeatmap: boolean;
  /** Short human readable note (Indonesian). */
  note: string;
}

export const AUTO_THRESHOLDS = {
  medium: 150,
  low: 600,
  minimal: 2000,
} as const;

export const getMapDetail = (count: number, labelsWanted = true): MapDetail => {
  if (count > AUTO_THRESHOLDS.minimal) {
    return {
      level: "minimal",
      showLabels: false,
      cluster: true,
      scale: 5,
      strokeWeight: 0,
      optimized: true,
      preferHeatmap: true,
      note: `Mode hemat: ${count.toLocaleString("id-ID")} titik — label & detail marker dimatikan otomatis.`,
    };
  }
  if (count > AUTO_THRESHOLDS.low) {
    return {
      level: "low",
      showLabels: false,
      cluster: true,
      scale: 6,
      strokeWeight: 1,
      optimized: true,
      preferHeatmap: false,
      note: `Detail rendah otomatis: ${count.toLocaleString("id-ID")} titik — label disembunyikan & marker dikelompokkan.`,
    };
  }
  if (count > AUTO_THRESHOLDS.medium) {
    return {
      level: "medium",
      showLabels: false,
      cluster: true,
      scale: 8,
      strokeWeight: 1.5,
      optimized: true,
      preferHeatmap: false,
      note: `Detail sedang otomatis: ${count.toLocaleString("id-ID")} titik — marker dikelompokkan agar peta tetap responsif.`,
    };
  }
  return {
    level: "full",
    showLabels: labelsWanted,
    cluster: false,
    scale: labelsWanted ? 14 : 9,
    strokeWeight: 2,
    optimized: false,
    preferHeatmap: false,
    note: "",
  };
};
