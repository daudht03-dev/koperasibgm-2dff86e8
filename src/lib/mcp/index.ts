import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listFarmersTool from "./tools/list-farmers";
import listBatchesTool from "./tools/list-batches";
import warehouseStockTool from "./tools/warehouse-stock";
import traceProductTool from "./tools/trace-product";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "bgm-koperasi-mcp",
  title: "Berkah Gendis Mandiri Koperasi MCP",
  version: "0.1.0",
  instructions:
    "Tools for the BGM koperasi harvest management system. Use `list_farmers` to browse petani, `list_batches` for penerimaan gudang, `warehouse_stock` for current gudang stock, and `trace_product` to trace a product identity code across the supply chain.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listFarmersTool, listBatchesTool, warehouseStockTool, traceProductTool],
});
