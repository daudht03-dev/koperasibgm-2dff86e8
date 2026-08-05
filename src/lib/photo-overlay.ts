/**
 * Canvas renderer for GPS Map Camera style photo watermarks.
 * Rendering happens on canvas (not CSS) so the downloaded file is
 * pixel-identical to the preview.
 */

export interface OverlayData {
  /** Big heading, e.g. "Pekuncen, Jawa Tengah" */
  heading: string;
  /** Full address line(s) */
  address: string;
  lat: number;
  lng: number;
  /** e.g. "Lahan Petani" / "Alamat Petani" */
  note: string;
  /** e.g. "Sugeng (PK1)" or "Sugeng (PK1A)" */
  subject: string;
  /** Formatted date-time */
  timestamp: string;
  /** Optional plus code */
  plusCode?: string;
}

const loadImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] => {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && current && lines[maxLines - 1] !== current) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
};

export interface RenderOptions {
  photoSrc: string;
  data: OverlayData;
  mapThumbSrc?: string | null;
  logoSrc?: string | null;
  maxWidth?: number;
  /** Paint an opaque panel first — used when re-stamping an already watermarked photo. */
  solidPanel?: boolean;
}

/** Draws the photo + watermark onto the given canvas. */
export async function renderPhotoOverlay(
  canvas: HTMLCanvasElement,
  { photoSrc, data, mapThumbSrc, logoSrc, maxWidth = 1600, solidPanel = false }: RenderOptions,
): Promise<void> {
  const [photo, mapThumb, logo] = await Promise.all([
    loadImage(photoSrc),
    mapThumbSrc ? loadImage(mapThumbSrc) : Promise.resolve(null),
    logoSrc ? loadImage(logoSrc) : Promise.resolve(null),
  ]);
  if (!photo) throw new Error("Gagal memuat foto");

  const scale = Math.min(1, maxWidth / photo.naturalWidth);
  const W = Math.round(photo.naturalWidth * scale);
  const H = Math.round(photo.naturalHeight * scale);
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung");
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(photo, 0, 0, W, H);

  // --- overlay panel ---
  const pad = Math.round(W * 0.022);
  const panelH = Math.round(Math.max(W * 0.24, 190));
  const panelY = H - panelH;

  if (solidPanel) {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, panelY - panelH * 0.1, W, panelH * 1.1);
  }

  const grad = ctx.createLinearGradient(0, panelY - panelH * 0.25, 0, H);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.25, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, panelY - panelH * 0.25, W, panelH * 1.25);


  // mini map
  const mapSize = panelH - pad * 2;
  const mapX = pad;
  const mapY = panelY + pad;
  ctx.save();
  roundRect(ctx, mapX, mapY, mapSize, mapSize, Math.round(mapSize * 0.08));
  ctx.clip();
  if (mapThumb) {
    ctx.drawImage(mapThumb, mapX, mapY, mapSize, mapSize);
  } else {
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.fillStyle = "#9ca3af";
    ctx.font = `${Math.round(mapSize * 0.12)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("PETA", mapX + mapSize / 2, mapY + mapSize / 2);
    ctx.textAlign = "left";
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = Math.max(2, W * 0.002);
  roundRect(ctx, mapX, mapY, mapSize, mapSize, Math.round(mapSize * 0.08));
  ctx.stroke();

  // text block
  const textX = mapX + mapSize + pad;
  const logoBox = logo ? Math.round(panelH * 0.28) : 0;
  const textW = W - textX - pad - (logo ? logoBox + pad : 0);
  let y = mapY;

  const base = Math.max(13, Math.round(W * 0.021));
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = Math.max(2, W * 0.003);

  ctx.font = `700 ${Math.round(base * 1.5)}px sans-serif`;
  const headingLines = wrapText(ctx, data.heading || "-", textW, 1);
  headingLines.forEach((line) => {
    ctx.fillText(line, textX, y);
    y += Math.round(base * 1.75);
  });

  ctx.font = `400 ${base}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const addressLines = wrapText(ctx, data.address || "-", textW, 2);
  addressLines.forEach((line) => {
    ctx.fillText(line, textX, y);
    y += Math.round(base * 1.3);
  });

  ctx.font = `600 ${base}px sans-serif`;
  ctx.fillStyle = "#ffffff";
  const coordLine = `Lat ${data.lat.toFixed(6)}°  Long ${data.lng.toFixed(6)}°`;
  ctx.fillText(coordLine, textX, y);
  y += Math.round(base * 1.35);

  if (data.plusCode) {
    ctx.font = `400 ${Math.round(base * 0.92)}px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`Plus Code: ${data.plusCode}`, textX, y);
    y += Math.round(base * 1.25);
  }

  ctx.font = `600 ${base}px sans-serif`;
  ctx.fillStyle = "#facc15";
  const subjectLine = [data.note, data.subject].filter(Boolean).join(" • ");
  wrapText(ctx, subjectLine, textW, 1).forEach((line) => {
    ctx.fillText(line, textX, y);
    y += Math.round(base * 1.3);
  });

  ctx.font = `400 ${Math.round(base * 0.95)}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(data.timestamp, textX, y);

  // logo
  if (logo && logoBox) {
    const ratio = logo.naturalWidth / logo.naturalHeight || 1;
    const lw = ratio >= 1 ? logoBox : logoBox * ratio;
    const lh = ratio >= 1 ? logoBox / ratio : logoBox;
    ctx.shadowBlur = 0;
    ctx.drawImage(logo, W - pad - lw, panelY + pad, lw, lh);
  }
  ctx.shadowBlur = 0;
}

export const canvasToBlob = (canvas: HTMLCanvasElement, quality = 0.92): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal membuat gambar"))),
      "image/jpeg",
      quality,
    );
  });
