import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_farmers",
  title: "List farmers",
  description:
    "List petani (farmers) registered in the koperasi, including their kode_petani, name, and assigned pengepul (collector).",
  inputSchema: {
    search: z
      .string()
      .optional()
      .describe("Optional case-insensitive filter matched against kode_petani or nama_petani."),
    limit: z.number().int().min(1).max(500).default(100),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("petani")
      .select("id, kode_petani, nama_petani, alamat, no_hp, pengepul_id, pengepul(nama_pengepul, kode_pengepul)")
      .order("kode_petani", { ascending: true })
      .limit(limit);
    if (search && search.trim()) {
      const s = search.trim();
      query = query.or(`kode_petani.ilike.%${s}%,nama_petani.ilike.%${s}%`);
    }
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { farmers: data ?? [] },
    };
  },
});
