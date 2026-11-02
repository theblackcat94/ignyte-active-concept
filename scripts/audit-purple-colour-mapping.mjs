// Compare the five Jacaranda SKU families with the approved catalogue before
// correcting an accidental customer-facing Aurora label. IGN009 Aurora is
// deliberately excluded. Run without --apply for a read-only report.
import { readFileSync } from "node:fs";

const envIndex = process.argv.indexOf("--env-file");
if (envIndex >= 0) {
  const path = process.argv[envIndex + 1];
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
const api = new URL("/rest/v1/products", process.env.NEXT_PUBLIC_SUPABASE_URL);
async function query(params, method = "GET", body) {
  const target = new URL(api);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  const response = await fetch(target, { method, headers: {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error(`Catalogue API returned ${response.status}: ${await response.text()}`);
  return response.json();
}
const approved = JSON.parse(readFileSync(new URL("../data/jacob-catalog-2026-10-27.json", import.meta.url), "utf8"));
const expected = [
  ["aura-halter-lavender", "IGN-HALT-JAC-"],
  ["seamless-legging-lavender", "IGN-LGS-JAC-"],
  ["seamless-sports-bra-jacaranda", "IGN-LVR-BRA-JAC-"],
  ["motion-sports-bra-jacaranda", "IGN-MOTSBR-JAC-"],
  ["all-in-motion-shorts-jacaranda", "IGN-MOTSHTS-JAC-"],
];
const slugs = expected.map(([slug]) => slug);
const columns = "id,slug,name,color,description,label,image_path,gallery,pdp_content,product_variants(id,sku,size,price_cents,sale_price_cents,stock_on_hand,stock_revision,active)";
const data = await query({ select: columns, slug: `in.(${[...slugs, "seamless-short-aurora"].join(",")})` });
const bySlug = new Map(data.map(product => [product.slug, product]));
const changes = [];
for (const [slug, skuPrefix] of expected) {
  const product = bySlug.get(slug);
  const reference = approved.products.find(item => item.slug === slug);
  if (!product || !reference || reference.color !== "Jacaranda" || product.name !== reference.name) {
    throw new Error(`Unexpected product identity for ${slug}`);
  }
  const currentVariants = product.product_variants.filter(variant => variant.active);
  if (!currentVariants.length || currentVariants.some(variant => !variant.sku.startsWith(skuPrefix))) {
    throw new Error(`Unexpected active SKU family for ${slug}: ${product.product_variants.map(variant => `${variant.sku}(${variant.active})`).join(", ")}`);
  }
  const mediaMatches = product.image_path === reference.image_path &&
    JSON.stringify(product.gallery.map(item => item.image)) === JSON.stringify(reference.gallery.map(item => item.image));
  const report = { slug, id: product.id, skuPrefix, currentColour: product.color,
    approvedColour: reference.color, mediaMatches, image: product.image_path,
    galleryAltColours: [...new Set(product.gallery.map(item => /Jacaranda|Aurora|Lavender|Lilac/i.exec(item.alt)?.[0] ?? "none"))] };
  console.log(JSON.stringify(report));
  if (!mediaMatches) throw new Error(`Media association differs from approved catalogue for ${slug}; no changes made`);
  if (product.color === "Aurora") changes.push(product);
  else if (product.color !== "Jacaranda") throw new Error(`Unexpected colour for ${slug}; no changes made`);
}
const auroraShorts = bySlug.get("seamless-short-aurora");
if (!auroraShorts || auroraShorts.color !== "Aurora" ||
    auroraShorts.product_variants.some(variant => !variant.sku.startsWith("IGN-LVR-SHTS-JAC-"))) {
  throw new Error("Seamless Shorts Aurora identity needs manual review; no changes made");
}
console.log(JSON.stringify({ slug: auroraShorts.slug, currentColour: auroraShorts.color, action: "preserve" }));
if (!process.argv.includes("--apply")) {
  console.log(`Inspection only. ${changes.length} approved Jacaranda products have an Aurora label.`);
  process.exit(0);
}
for (const product of changes) {
  const updated = await query({ select: "id,slug,color,product_variants(id,sku,size,price_cents,sale_price_cents,stock_on_hand,stock_revision,active)",
    id: `eq.${product.id}`, slug: `eq.${product.slug}`, color: "eq.Aurora" }, "PATCH", { color: "Jacaranda" });
  if (updated?.length !== 1) throw new Error(`Correction failed for ${product.slug}: concurrent change`);
  const before = JSON.stringify(product.product_variants.sort((a, b) => a.sku.localeCompare(b.sku)));
  const after = JSON.stringify(updated[0].product_variants.sort((a, b) => a.sku.localeCompare(b.sku)));
  if (updated[0].id !== product.id || before !== after) throw new Error(`Variant verification failed for ${product.slug}`);
  console.log(`Corrected ${product.slug}: Aurora -> Jacaranda; product ID and variants unchanged.`);
}
