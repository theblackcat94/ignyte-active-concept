// Update only the planner's short descriptions. Dry run unless --apply is set.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(root, "data/jacob-catalog-2026-10-27.json"), "utf8"));
const copy = JSON.parse(readFileSync(resolve(root, "data/product-short-descriptions.json"), "utf8"));
const families = {
  "Aura Halter Top": ["IGN001", "IGN-HALT-"],
  "All In Motion Shorts": ["IGN002", "IGN-MOTSHTS-"],
  "Motion Sports Bra": ["IGN003", "IGN-MOTSBR-"],
  "Sculpt Shorts": ["IGN004", "IGN-VSCLP-"],
  "Seamless Leggings": ["IGN008", "IGN-LGS-"],
  "Seamless Shorts": ["IGN009", "IGN-LVR-SHTS-"],
  "Vyper Sports Bra": ["IGN010", "IGN-MOMSBR-"],
  "Seamless Sports Bra": ["IGN011", "IGN-LVR-BRA-"],
  "IGNYTE Socks": ["IGN012", "IGN-SOCKS-"],
};
const envAt = process.argv.indexOf("--env-file");
if (envAt !== -1) {
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
if (!url || !key) throw new Error("Supabase URL and secret key are required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: products, error } = await db.from("products").select("id,slug,name,description,status,product_variants(sku,active)");
if (error) throw error;
const bySlug = new Map(products.map(product => [product.slug, product]));
if (manifest.products.length !== 16) throw new Error("Catalogue count changed; review the mapping");
const updates = [];
for (const source of manifest.products) {
  const family = families[source.name];
  const stored = bySlug.get(source.slug);
  if (!family) throw new Error(`Unmapped planner name: ${source.slug}`);
  if (!stored) throw new Error(`Stored product missing: ${source.slug}`);
  if (stored.name !== source.name) throw new Error(`Stored name differs: ${source.slug}`);
  if (!source.variants.every(variant => variant.sku.startsWith(family[1]))) throw new Error(`Source SKU family differs: ${source.slug}`);
  if (!stored.product_variants.some(variant => variant.sku.startsWith(family[1]))) throw new Error(`Stored SKU family missing: ${source.slug}`);
  if (stored.product_variants.some(variant => !variant.sku.startsWith(family[1]))) throw new Error(`Stored SKU family mixed: ${source.slug}`);
  if (source.description !== copy[family[0]]) throw new Error(`Source copy differs from planner: ${source.slug}`);
  if (stored.description !== source.description) updates.push({ stored, description: source.description });
}
console.log(`${manifest.products.length} approved listings checked; ${updates.length} descriptions to update; statuses and stock unchanged.`);
for (const { stored } of updates) console.log(`DESCRIPTION ${stored.slug} (${stored.status})`);
if (!process.argv.includes("--apply")) {
  console.log("Dry run only. Pass --apply to update descriptions.");
  process.exit(0);
}
for (const { stored, description } of updates) {
  const { data, error: updateError } = await db.from("products").update({ description })
    .eq("id", stored.id).eq("description", stored.description).select("id");
  if (updateError || data?.length !== 1) throw new Error(`Description changed during update: ${stored.slug}`);
}
console.log(`Updated ${updates.length} descriptions.`);
