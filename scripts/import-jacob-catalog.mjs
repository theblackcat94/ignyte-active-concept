// Idempotent import of Jacob's approved MEDIA READY catalogue into Supabase.
// Dry run by default. Run with --apply only after reviewing the plan.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(resolve(root, "data/jacob-catalog-2026-10-27.json"), "utf8"));
const apply = process.argv.includes("--apply");
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
const checked = (result, context) => {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
};

if (manifest.products.length !== 16 ||
    manifest.products.reduce((sum, product) => sum + product.variants.length, 0) !== 45) {
  throw new Error("Approved catalogue count changed");
}
for (const product of manifest.products) {
  for (const media of [product.image_path, ...product.gallery.map(image => image.image)]) {
    if (!media.startsWith("/images/jacob-2026-10/") || !existsSync(resolve(root, "public", media.slice(1)))) {
      throw new Error(`Missing prepared image: ${media}`);
    }
  }
}

const existing = checked(await db.from("products").select("*,product_variants(*)"), "Load products");
const bySlug = new Map(existing.map(product => [product.slug, product]));
const skus = new Set(existing.flatMap(product => product.product_variants.map(variant => variant.sku)));
for (const product of manifest.products) {
  for (const variant of product.variants) {
    if (skus.has(variant.sku) && !bySlug.get(product.slug)?.product_variants.some(row => row.sku === variant.sku)) {
      throw new Error(`Source SKU belongs to another product: ${variant.sku}`);
    }
  }
}
console.log(`Approved import: ${manifest.products.length} listings, 45 size SKUs, 92 local JPEGs`);
console.log(`${manifest.products.filter(product => bySlug.has(product.slug)).length} existing listings; ${manifest.products.filter(product => !bySlug.has(product.slug)).length} new listings`);
for (const product of manifest.products) {
  const current = bySlug.get(product.slug);
  const sizes = new Set(product.variants.map(variant => variant.size));
  const retired = current?.product_variants.filter(variant => variant.active && !sizes.has(variant.size)).length ?? 0;
  console.log(`${current ? "UPDATE" : "CREATE"} ${product.slug}: ${product.variants.map(item => item.size).join(", ")}${retired ? `; deactivate ${retired} unsupported sizes` : ""}`);
}
if (!apply) {
  console.log("Dry run only. Pass --apply to write Supabase.");
  process.exit(0);
}

if (manifest.products.some(product => product.category === "accessories")) {
  checked(await db.from("categories").upsert({ slug: "accessories", name: "Accessories",
    cover_path: manifest.products.find(product => product.category === "accessories").image_path,
    sort_order: 50, active: true }, { onConflict: "slug" }), "Save Accessories category");
}

let created = 0;
let updated = 0;
let variantsCreated = 0;
let variantsUpdated = 0;
let variantsDeactivated = 0;
for (const source of manifest.products) {
  const current = bySlug.get(source.slug);
  const fields = {
    slug: source.slug, name: source.name, category: source.category, color: source.color,
    description: source.description, status: "active", label: current?.label ?? null,
    image_path: source.image_path, gallery: source.gallery,
  };
  let productId;
  if (current) {
    checked(await db.from("products").update(fields).eq("id", current.id).select("id").single(), `Update ${source.slug}`);
    productId = current.id;
    updated++;
  } else {
    productId = checked(await db.from("products").insert(fields).select("id").single(), `Create ${source.slug}`).id;
    created++;
  }
  const oldBySize = new Map((current?.product_variants ?? []).map(variant => [variant.size, variant]));
  const approvedSizes = new Set(source.variants.map(variant => variant.size));
  for (const variant of source.variants) {
    const old = oldBySize.get(variant.size);
    if (old) {
      const sale = old.sale_price_cents && old.sale_price_cents < variant.price_cents ? old.sale_price_cents : null;
      const result = checked(await db.from("product_variants").update({
        sku: variant.sku, price_cents: variant.price_cents, sale_price_cents: sale,
        active: true, stock_revision: old.stock_revision + 1,
      }).eq("id", old.id).eq("stock_revision", old.stock_revision).select("id"), `Update ${variant.sku}`);
      if (result.length !== 1) throw new Error(`Stock changed during import: ${variant.sku}`);
      variantsUpdated++;
    } else {
      checked(await db.from("product_variants").insert({ product_id: productId,
        sku: variant.sku, size: variant.size, price_cents: variant.price_cents,
        stock_on_hand: 20, active: true }), `Create ${variant.sku}`);
      variantsCreated++;
    }
  }
  for (const old of current?.product_variants ?? []) {
    if (old.active && !approvedSizes.has(old.size)) {
      checked(await db.from("product_variants").update({ active: false,
        stock_revision: old.stock_revision + 1 }).eq("id", old.id)
        .eq("stock_revision", old.stock_revision), `Deactivate unsupported size ${old.sku}`);
      variantsDeactivated++;
    }
  }
}
console.log(`Import complete: ${created} products created, ${updated} updated; ${variantsCreated} variants created, ${variantsUpdated} updated, ${variantsDeactivated} unsupported sizes deactivated.`);
