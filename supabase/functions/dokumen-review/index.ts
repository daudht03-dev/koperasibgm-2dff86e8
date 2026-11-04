// AI review of sensitive farmer document photos (tipe 'ktp' / 'pelatihan').
// Reads the object with the service key, asks the AI Gateway for a structured
// completeness/legibility review, and stores it in public.dokumen_review.
// Caller must hold one of the roles allowed to read KTP photos.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";
import {
  generateResponse,
  GatewayError,
  PaymentRequiredError,
  PermissionDeniedError,
  RateLimitError,
} from "npm:@lovable.dev/ai-gateway";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ROLES = ["admin", "developer", "staf_lapang", "pengawas", "auditor"];
const DOC_TIPE = ["ktp", "pelatihan"];
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MODEL = "openai/gpt-6-astra" as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    jenis_dokumen: { type: "string", enum: ["ktp", "pelatihan"] },
    verdict: { type: "string", enum: ["lengkap", "perlu_perbaikan", "tidak_layak"] },
    ringkasan: { type: "string" },
    kelengkapan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          aspek: { type: "string" },
          status: { type: "string", enum: ["ada", "hilang", "tidak_dapat_dipastikan"] },
          catatan: { type: "string" },
        },
        required: ["aspek", "status", "catatan"],
        additionalProperties: false,
      },
    },
    keterbacaan: {
      type: "object",
      properties: {
        skor: { type: "integer" },
        masalah: { type: "array", items: { type: "string" } },
      },
      required: ["skor", "masalah"],
      additionalProperties: false,
    },
    temuan: { type: "array", items: { type: "string" } },
    tindak_lanjut: {
      type: "array",
      items: {
        type: "object",
        properties: {
          prioritas: { type: "string", enum: ["tinggi", "sedang", "rendah"] },
          aksi: { type: "string" },
        },
        required: ["prioritas", "aksi"],
        additionalProperties: false,
      },
    },
  },
  required: [
    "jenis_dokumen",
    "verdict",
    "ringkasan",
    "kelengkapan",
    "keterbacaan",
    "temuan",
    "tindak_lanjut",
  ],
  additionalProperties: false,
} as const;

const buildInstructions = (tipe: string, kode: string | null, nama: string | null): string =>
  [
    "Anda petugas QC dokumen pada program pertanian organik.",
    `Tinjau foto dokumen berikut: ${tipe === "ktp" ? "foto KTP petani" : "foto sertifikat/pelatihan petani"}${
      kode ? ` (petani ${kode}${nama ? ` - ${nama}` : ""})` : ""
    }.`,
    "",
    "Periksa dua hal:",
    "1. Kelengkapan: seluruh bagian penting dokumen terlihat utuh dan tidak terpotong.",
    "   - Foto KTP: kartu utuh (keempat sudut terlihat), tidak terpotong tepi, tidak tertutup jari atau benda lain, orientasi tegak.",
    "   - Foto pelatihan: judul/nama pelatihan, tanggal, penyelenggara, serta tanda tangan atau stempel terlihat bila memang ada.",
    "2. Keterbacaan: teks utama tajam dan cukup kontras. Beri skor 0-100 (0 = sama sekali tidak terbaca, 100 = sangat tajam) dan sebutkan masalah konkret seperti blur, terlalu gelap, silau, resolusi rendah, atau objek menutupi teks.",
    "",
    "JANGAN menyalin atau menghasilkan data pribadi apa pun (NIK, nama, alamat, tanggal lahir, atau nomor dokumen) di dalam jawaban.",
    "Jawab dalam Bahasa Indonesia yang praktis dan netral, sesuai skema JSON yang diminta.",
  ].join("\n");

const extractText = (res: { output?: Array<Record<string, unknown>> }): string => {
  const parts: string[] = [];
  for (const item of res.output ?? []) {
    if (item.type !== "message") continue;
    const content = (item as { content?: Array<{ type?: string; text?: string }> }).content ?? [];
    for (const part of content) {
      if (part.type === "output_text" && typeof part.text === "string") parts.push(part.text);
    }
  }
  return parts.join("\n").trim();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userData } = await userClient.auth.getUser();
    const caller = userData?.user;
    if (!caller) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", caller.id);
    const roles = (roleRows || []).map((r) => r.role);
    if (!roles.some((r) => ALLOWED_ROLES.includes(r))) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const fotoId = typeof body?.fotoId === "string" ? body.fotoId : "";
    if (!UUID_RE.test(fotoId)) return json({ error: "fotoId wajib berupa UUID" }, 400);

    const { data: foto } = await admin
      .from("foto_lahan")
      .select("id,tipe,file_path,kode,nama_petani,taken_at")
      .eq("id", fotoId)
      .maybeSingle();
    if (!foto) return json({ error: "Foto tidak ditemukan" }, 404);
    if (!DOC_TIPE.includes(foto.tipe)) {
      return json({ error: "Tinjauan AI hanya untuk foto tipe 'ktp' atau 'pelatihan'" }, 400);
    }

    const { data: blob, error: dlErr } = await admin.storage.from("foto-lahan").download(foto.file_path);
    if (dlErr || !blob) {
      console.error("object download failed:", dlErr?.message);
      return json({ error: "Gagal mengambil berkas foto dari penyimpanan" }, 404);
    }
    if (blob.size > MAX_IMAGE_BYTES) {
      return json({ error: "Ukuran foto terlalu besar untuk ditinjau (maksimal 12 MB)" }, 413);
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const dataUrl = `data:image/jpeg;base64,${btoa(binary)}`;

    const response = await generateResponse({
      model: MODEL,
      instructions: buildInstructions(foto.tipe, foto.kode, foto.nama_petani),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Tinjau foto dokumen terlampir dan kembalikan hasilnya sesuai format JSON yang diminta.",
            },
            { type: "input_image", image_url: dataUrl, detail: "high" },
          ],
        },
      ],
      text: { format: { type: "json_schema", name: "dokumen_review", strict: true, schema: REVIEW_SCHEMA } },
      reasoning: { effort: "low" },
      max_output_tokens: 2000,
    });

    const text = extractText(response as { output?: Array<Record<string, unknown>> });
    let hasil: Record<string, unknown>;
    try {
      hasil = JSON.parse(text);
    } catch {
      console.error("model output was not valid JSON:", text.slice(0, 200));
      return json({ error: "Hasil tinjauan AI tidak dapat dibaca, coba lagi" }, 502);
    }

    const verdict = typeof hasil.verdict === "string" ? hasil.verdict : null;
    const { data: row, error: insertErr } = await admin
      .from("dokumen_review")
      .insert({ foto_id: fotoId, hasil, verdict, model: MODEL, reviewed_by: caller.id })
      .select("id,foto_id,hasil,verdict,model,created_at")
      .single();
    if (insertErr) {
      console.error("failed to save review:", insertErr.message);
      return json({ error: "Tinjauan selesai tetapi gagal disimpan" }, 500);
    }

    return json({ review: row });
  } catch (err) {
    if (err instanceof GatewayError) {
      console.error("gateway error:", err.code, err.httpStatus, err.recovery);
      if (err instanceof PaymentRequiredError) {
        return json({ error: "Kredit AI habis — isi ulang kredit lalu coba lagi" }, 402);
      }
      if (err instanceof PermissionDeniedError) {
        return json({ error: "Akses model ditolak oleh pengaturan workspace" }, 403);
      }
      if (err instanceof RateLimitError) {
        return json({ error: "Terlalu banyak permintaan, coba beberapa saat lagi" }, 429);
      }
      return json({ error: "Layanan AI sedang bermasalah, coba lagi nanti" }, 502);
    }
    console.error("unexpected error:", err);
    return json({ error: "Kegagalan tak terduga saat meninjau dokumen" }, 500);
  }
});
