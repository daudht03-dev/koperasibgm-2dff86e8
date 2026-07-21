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
  name: "trace_product",
  title: "Trace product code",
  description:
    "Trace a product identity code (e.g. BN6-201025-001) across penjualan_petani, batch_panen, proses_pengeringan, and gudang_stok stages.",
  inputSchema: {
    product_code: z
      .string()
      .min(3)
      .describe("The product identity code to trace, e.g. 'BN6-201025-001'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ product_code }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const pattern = `%${product_code}%`;
    const [sales, batches, drying, stock] = await Promise.all([
      supabase.from("penjualan_petani").select("*").ilike("detail_petani::text", pattern).limit(50),
      supabase.from("batch_panen").select("*").ilike("detail_petani::text", pattern).limit(50),
      supabase.from("proses_pengeringan").select("*").ilike("detail_batch::text", pattern).limit(50),
      supabase.from("gudang_stok").select("*").ilike("detail::text", pattern).limit(50),
    ]);
    const stages = {
      penjualan_petani: sales.data ?? [],
      batch_panen: batches.data ?? [],
      proses_pengeringan: drying.data ?? [],
      gudang_stok: stock.data ?? [],
    };
    const found = Object.entries(stages)
      .filter(([, rows]) => rows.length > 0)
      .map(([stage, rows]) => `${stage}: ${rows.length}`)
      .join(", ");
    return {
      content: [
        { type: "text", text: found ? `Found in ${found}` : "No trace matches found." },
      ],
      structuredContent: { product_code, stages },
    };
  },
});
