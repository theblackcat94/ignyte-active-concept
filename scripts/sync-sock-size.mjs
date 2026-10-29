// Canonicalize the approved sock size label without changing stock or price.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envAt = process.argv.indexOf("--env-file");
if (envAt >= 0) {
  const path = process.argv[envAt + 1];
  if (!path) throw new Error("Pass a path after --env-file");
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) throw new Error("Invalid environment file line");
    process.env[line.slice(0, separator)] = line.slice(separator + 1);
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase configuration missing");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: product, error: productError } = await db.from("products").select("id,name,slug").eq("slug", "ignyte-socks-white").single();
if (productError || product?.name !== "IGNYTE Socks") throw new Error("Sock product identity differs");
const { data: variants, error: variantsError } = await db.from("product_variants").select("id,sku,size,active").eq("product_id", product.id);
if (variantsError || variants?.length !== 1 || variants[0].sku !== "IGN-SOCKS-ONESIZE") throw new Error("Sock variant identity differs");
const variant = variants[0];
if (!["One Size", "One size"].includes(variant.size)) throw new Error("Unexpected sock size label");
console.log(`${product.slug}: ${variant.size} -> One size; stock and price unchanged.`);
if (!process.argv.includes("--apply") || variant.size === "One size") process.exit(0);
const { data, error } = await db.from("product_variants").update({ size: "One size" }).eq("id", variant.id).eq("size", variant.size).select("id");
if (error || data?.length !== 1) throw new Error("Sock size changed during update");
console.log("Updated sock variant label.");
