// Inspect or rename only the existing IGN009 Jacaranda listing. No variant,
// price, stock, SKU, image path, or other product is changed.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const oldSlug = "seamless-short-jacaranda";
const newSlug = "seamless-short-aurora";
const expectedSkus = ["IGN-LVR-SHTS-JAC-S", "IGN-LVR-SHTS-JAC-M", "IGN-LVR-SHTS-JAC-L"];
const args = process.argv.slice(2);
const envIndex = args.indexOf("--env-file");
if (envIndex >= 0) {
  const path = args[envIndex + 1];
  if (!path) throw new Error("--env-file needs a path");
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const at = line.indexOf("=");
    if (at < 1) throw new Error("Invalid environment file line");
    process.env[line.slice(0, at)] = line.slice(at + 1);
  }
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error("Supabase server configuration is missing");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const checked = (result, label) => {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
};
const records = checked(await db.from("products")
  .select("id,slug,name,category,color,description,label,image_path,gallery,pdp_content,status,product_variants(id,sku,size,price_cents,sale_price_cents,stock_on_hand,stock_revision,active)")
  .in("slug", [oldSlug, newSlug]), "Load IGN009 listings");
if (records.length !== 1) throw new Error(`Expected exactly one old or new listing; found ${records.length}`);
const product = records[0];
const skus = product.product_variants.map(variant => variant.sku).sort();
if (product.category !== "shorts" || product.name !== "Seamless Shorts" ||
    skus.length !== expectedSkus.length || skus.some((sku, index) => sku !== [...expectedSkus].sort()[index])) {
  throw new Error("Product identity or SKU family differs from approved IGN009; no changes made");
}
console.log(JSON.stringify({ slug: product.slug, name: product.name, color: product.color,
  status: product.status, productId: product.id,
  variants: product.product_variants.map(({ sku, size, price_cents, sale_price_cents, stock_on_hand, active }) =>
    ({ sku, size, price_cents, sale_price_cents, stock_on_hand, active })),
  image_path: product.image_path, gallery: product.gallery,
  description: product.description, pdp_content: product.pdp_content }, null, 2));
if (!args.includes("--apply")) {
  console.log("Inspection only; no changes made.");
  process.exit(0);
}
if (product.slug === newSlug) {
  if (product.color !== "Aurora") throw new Error("New slug exists with an unexpected colour");
  console.log("Already renamed; no changes made.");
  process.exit(0);
}
if (product.color !== "Jacaranda") throw new Error("Old listing has an unexpected colour; no changes made");
const rename = value => typeof value === "string" ? value.replace(/\bJacaranda\b/gi, "Aurora") : value;
const gallery = product.gallery.map(item => ({ ...item, alt: rename(item.alt) }));
const content = product.pdp_content ? { ...product.pdp_content } : null;
if (content) {
  for (const key of ["features", "fit", "fabric", "support_level", "care_instructions", "model_details"]) {
    if (Array.isArray(content[key])) content[key] = content[key].map(rename);
    else content[key] = rename(content[key]);
  }
}
const changes = { slug: newSlug, name: "Seamless Shorts", color: "Aurora",
  description: rename(product.description), label: rename(product.label), gallery };
if (content) changes.pdp_content = content;
const updated = checked(await db.from("products").update(changes)
  .eq("id", product.id).eq("slug", oldSlug).eq("color", "Jacaranda")
  .select("id,slug,name,color,description,image_path,gallery,product_variants(id,sku,size,price_cents,sale_price_cents,stock_on_hand,stock_revision,active)"), "Rename IGN009 listing");
if (updated.length !== 1) throw new Error("Concurrent catalogue change; verify the listing before retrying");
const after = updated[0];
const variantSignature = variants => JSON.stringify(variants.map(variant => ({
  id: variant.id, sku: variant.sku, size: variant.size,
  price_cents: variant.price_cents, sale_price_cents: variant.sale_price_cents,
  stock_on_hand: variant.stock_on_hand, stock_revision: variant.stock_revision,
  active: variant.active,
})).sort((a, b) => a.sku.localeCompare(b.sku)));
if (after.id !== product.id || after.slug !== newSlug || after.color !== "Aurora" ||
    after.image_path !== product.image_path ||
    variantSignature(after.product_variants) !== variantSignature(product.product_variants)) {
  throw new Error("Post-update identity or variant verification failed");
}
console.log(`Renamed ${oldSlug} to ${newSlug}; SKU, stock, pricing and images verified unchanged.`);
