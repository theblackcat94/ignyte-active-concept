// Idempotent IGN009 Jacaranda import. Requires a confirmed price before any write.
// Run without --apply to inspect the plan. Existing SKU stock is preserved.
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = flag => {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
};
const priceCents = Number(option("--price-cents"));
if (!Number.isSafeInteger(priceCents) || priceCents <= 0) {
  throw new Error("A confirmed positive --price-cents value is required before publication");
}
const envFile = option("--env-file");
if (envFile) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const at = line.indexOf("=");
    if (at < 1) throw new Error("Invalid environment file line");
    process.env[line.slice(0, at)] = line.slice(at + 1);
  }
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error("Supabase URL and secret key are required");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const checked = (result, label) => {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
};

const slug = "seamless-short-jacaranda";
const aurora = checked(await db.from("products").select("id")
  .eq("slug", "seamless-short-aurora").maybeSingle(), "Check Aurora replacement");
if (aurora) throw new Error("Aurora is already published; the retired Jacaranda listing must not be recreated");
const directory = "/images/jacob-2026-10/ign-lvr-shts-jac/";
const prefix = "ign-lvr-shts-jac-seamless-shorts-jacaranda-";
const imagePath = `${directory}${prefix}main-01.jpg`;
const gallery = ["02", "03", "05", "06"].map(number => ({
  image: `${directory}${prefix}gallery-${number}.jpg`,
  alt: "Seamless Shorts in Jacaranda — gallery view",
}));
for (const path of [imagePath, ...gallery.map(item => item.image)]) {
  if (!existsSync(resolve(root, "public", path.slice(1)))) throw new Error(`Missing approved image: ${path}`);
}
const source = checked(await db.from("products").select("id,name,category,description")
  .eq("slug", "seamless-short-espresso").single(), "Load existing Seamless Shorts");
if (source.name !== "Seamless Shorts" || source.category !== "shorts") {
  throw new Error("Existing Seamless Shorts record does not match IGN009");
}
const target = checked(await db.from("products").select("id,slug,name,category,color,status,product_variants(id,sku,size,stock_on_hand,stock_revision,price_cents,active)")
  .eq("slug", slug).maybeSingle(), "Load Jacaranda listing");
if (target && (target.name !== source.name || target.category !== source.category || target.color !== "Jacaranda")) {
  throw new Error("Existing Jacaranda listing has conflicting identity");
}
const variants = [
  { sku: "IGN-LVR-SHTS-JAC-S", size: "S", stock: 50 },
  { sku: "IGN-LVR-SHTS-JAC-M", size: "M", stock: 54 },
  { sku: "IGN-LVR-SHTS-JAC-L", size: "L", stock: 51 },
];
const existingSkus = checked(await db.from("product_variants").select("id,product_id,sku,size,stock_on_hand,stock_revision,price_cents,active")
  .in("sku", variants.map(item => item.sku)), "Find exact SKUs");
if (existingSkus.some(item => item.product_id !== target?.id)) {
  throw new Error("An exact SKU belongs to another product; reconcile manually before publication");
}
if (target?.product_variants.some(item => !variants.some(variant => variant.sku === item.sku))) {
  throw new Error("The Jacaranda listing has additional variants; reconcile before publication");
}
for (const variant of variants) {
  const current = existingSkus.find(item => item.sku === variant.sku);
  if (current && current.size !== variant.size) throw new Error(`Size mismatch for ${variant.sku}`);
}
console.log(JSON.stringify({ slug, priceCents, product: target ? "update" : "create",
  variants: variants.map(variant => {
    const current = existingSkus.find(item => item.sku === variant.sku);
    return { sku: variant.sku, action: current ? "update" : "create",
      stock: current?.stock_on_hand ?? variant.stock, stockSource: current ? "existing catalog" : "Marcus screenshot" };
  }) }, null, 2));
if (!args.includes("--apply")) {
  console.log("Dry run only. Pass --apply after confirming price and inventory.");
  process.exit(0);
}

let productId = target?.id;
if (!productId) {
  productId = checked(await db.from("products").insert({ slug, name: source.name,
    category: source.category, color: "Jacaranda", description: source.description,
    image_path: imagePath, gallery, status: "draft" }).select("id").single(), "Create draft listing").id;
} else {
  checked(await db.from("products").update({ description: source.description,
    image_path: imagePath, gallery, status: "draft" }).eq("id", productId), "Update draft listing");
}
for (const variant of variants) {
  const current = existingSkus.find(item => item.sku === variant.sku);
  if (current) {
    const updated = checked(await db.from("product_variants").update({ price_cents: priceCents,
      sale_price_cents: null, active: true, stock_revision: current.stock_revision + 1 })
      .eq("id", current.id).eq("stock_revision", current.stock_revision).select("id"), `Update ${variant.sku}`);
    if (updated.length !== 1) throw new Error(`Concurrent stock change for ${variant.sku}`);
  } else {
    checked(await db.from("product_variants").insert({ product_id: productId,
      sku: variant.sku, size: variant.size, price_cents: priceCents,
      stock_on_hand: variant.stock, active: true }), `Create ${variant.sku}`);
  }
}
checked(await db.from("products").update({ status: "active" }).eq("id", productId), "Publish Jacaranda listing");
console.log(`Published ${slug}`);
