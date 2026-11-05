// Sync only planner-confirmed support ratings into product-level PDP content.
// Dry run by default; --apply updates matching products without touching variants.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const ratings = JSON.parse(readFileSync(new URL("../data/support-level-planner.json", import.meta.url), "utf8"));
const apply = process.argv.includes("--apply");
const envAt = process.argv.indexOf("--env-file");
if (envAt !== -1) {
  const file = process.argv[envAt + 1];
  if (!file) throw new Error("Pass an env file path");
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const value = match[2];
    process.env[match[1]] = value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase settings are required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: products, error } = await db.from("products").select("id,slug,name,category,status,pdp_content");
if (error) throw error;
const changes = products.flatMap(product => {
  const level = ratings[product.name];
  if (!level || product.pdp_content?.support_level === level) return [];
  return [{ product, level }];
});
for (const { product, level } of changes) {
  console.log(`${product.slug} (${product.status}): ${product.pdp_content?.support_level || "unset"} -> ${level}`);
  if (apply) {
    const { error: updateError } = await db.from("products")
      .update({ pdp_content: { ...product.pdp_content, support_level: level } }).eq("id", product.id);
    if (updateError) throw updateError;
  }
}
console.log(`${apply ? "Updated" : "Would update"} ${changes.length} product records; ${Object.keys(ratings).length} planner product families mapped.`);
