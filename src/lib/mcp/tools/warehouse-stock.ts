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
  name: "warehouse_stock",
  title: "Warehouse stock",
  description:
    "Return current gudang (warehouse) stock records with weights and batch references.",
  inputSchema: {
    limit: z.number().int().min(1).max(1000).default(200),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("gudang_stok")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const totalBerat = (data ?? []).reduce(
      (acc: number, row: any) => acc + Number(row.berat_kg ?? row.stok_kg ?? 0),
      0,
    );
    return {
      content: [
        {
          type: "text",
          text: `Total ${data?.length ?? 0} record, total berat ${totalBerat.toFixed(1)} Kg`,
        },
      ],
      structuredContent: { total_berat_kg: totalBerat, stock: data ?? [] },
    };
  },
});
