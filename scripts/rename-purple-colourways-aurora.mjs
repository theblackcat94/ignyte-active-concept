// Guarded development catalogue migration for Jacob's 2 November Aurora naming.
// Dry-run by default. Does not change variants, SKUs, prices, stock or media files.
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
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Supabase server configuration is missing");
const api = new URL("/rest/v1/products", process.env.NEXT_PUBLIC_SUPABASE_URL);
async function query(params, method = "GET", body) {
  const target = new URL(api);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  const response = await fetch(target, { method, headers: {
    apikey: process.env.SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json", Prefer: "return=representation",
  }, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error(`Catalogue API returned ${response.status}: ${await response.text()}`);
  return response.json();
}

const mappings = [
  ["aura-halter-lavender", "aura-halter-aurora", "IGN-HALT-JAC-"],
  ["seamless-legging-lavender", "seamless-legging-aurora", "IGN-LGS-JAC-"],
  ["seamless-sports-bra-jacaranda", "seamless-sports-bra-aurora", "IGN-LVR-BRA-JAC-"],
  ["motion-sports-bra-jacaranda", "motion-sports-bra-aurora", "IGN-MOTSBR-JAC-"],
  ["all-in-motion-shorts-jacaranda", "all-in-motion-shorts-aurora", "IGN-MOTSHTS-JAC-"],
];
const approved = JSON.parse(readFileSync(new URL("../data/jacob-catalog-2026-10-27.json", import.meta.url), "utf8"));
const columns = "id,slug,name,color,description,label,image_path,gallery,pdp_content,product_variants(id,sku,size,price_cents,sale_price_cents,stock_on_hand,stock_revision,active)";
const slugs = mappings.flatMap(([oldSlug, newSlug]) => [oldSlug, newSlug]);
const data = await query({ select: columns, slug: `in.(${slugs.join(",")})` });
const stages = [];
const legacyPath = path => path.replace("-aurora-", "-jacaranda-");
for (const [oldSlug, newSlug, skuPrefix] of mappings) {
  const matches = data.filter(product => product.slug === oldSlug || product.slug === newSlug);
  const product = matches[0];
  const reference = approved.products.find(item => item.slug === newSlug);
  if (matches.length !== 1 || !reference || !product || product.name !== reference.name || reference.color !== "Aurora") {
    throw new Error(`Unexpected product identity or duplicate listing for ${newSlug}`);
  }
  const activeVariants = product.product_variants.filter(variant => variant.active);
  if (!activeVariants.length || activeVariants.some(variant => !variant.sku.startsWith(skuPrefix))) throw new Error(`Unexpected active SKU family for ${newSlug}`);
  const expectedImage = product.slug === oldSlug ? legacyPath(reference.image_path) : reference.image_path;
  const expectedGallery = reference.gallery.map(item => product.slug === oldSlug ? legacyPath(item.image) : item.image);
  if (product.image_path !== expectedImage ||
    JSON.stringify(product.gallery.map(item => item.image)) !== JSON.stringify(expectedGallery)) {
    throw new Error(`Media association differs from approved product for ${newSlug}`);
  }
  if (product.slug === oldSlug && product.color !== "Jacaranda") throw new Error(`Unexpected current colour for ${oldSlug}`);
  if (product.slug === newSlug && product.color !== "Aurora") throw new Error(`Unexpected renamed colour for ${newSlug}`);
  stages.push({ product, oldSlug, newSlug, reference });
  console.log(JSON.stringify({ id: product.id, from: product.slug, to: newSlug, colour: product.color,
    skuPrefix, mediaMatches: true, variantCount: product.product_variants.length }));
}
if (!process.argv.includes("--apply")) {
  console.log(`Inspection only. ${stages.filter(stage => stage.product.slug === stage.oldSlug).length} products need Aurora migration.`);
  process.exit(0);
}
const renameText = value => typeof value === "string" ? value.replace(/\b(?:Jacaranda|Lavender|Lilac)\b/gi, "Aurora") : value;
const variantSignature = variants => JSON.stringify([...variants].sort((a, b) => a.sku.localeCompare(b.sku)));
for (const { product, oldSlug, newSlug, reference } of stages) {
  if (product.slug === newSlug) continue;
  const content = product.pdp_content ? { ...product.pdp_content } : null;
  if (content) for (const key of ["features", "fit", "fabric", "support_level", "care_instructions", "model_details"]) {
    content[key] = Array.isArray(content[key]) ? content[key].map(renameText) : renameText(content[key]);
  }
  if (content?.video_url?.startsWith("/images/product-videos/")) content.video_url = content.video_url.replace(oldSlug, newSlug);
  if (content?.video_poster?.startsWith("/images/product-videos/")) content.video_poster = content.video_poster.replace(oldSlug, newSlug);
  const changes = { slug: newSlug, color: "Aurora", description: renameText(product.description),
    label: renameText(product.label), image_path: reference.image_path,
    gallery: product.gallery.map((item, index) => ({ image: reference.gallery[index].image, alt: renameText(item.alt) })) };
  if (content) changes.pdp_content = content;
  const updated = await query({ select: columns, id: `eq.${product.id}`, slug: `eq.${oldSlug}`, color: "eq.Jacaranda" }, "PATCH", changes);
  if (updated.length !== 1 || updated[0].slug !== newSlug || updated[0].color !== "Aurora" ||
      updated[0].id !== product.id || updated[0].image_path !== reference.image_path ||
      variantSignature(updated[0].product_variants) !== variantSignature(product.product_variants) ||
      JSON.stringify(updated[0].gallery.map(item => item.image)) !== JSON.stringify(reference.gallery.map(item => item.image))) {
    throw new Error(`Post-update identity, variant or media check failed for ${newSlug}`);
  }
  console.log(`Migrated ${oldSlug} -> ${newSlug}; variants unchanged and Aurora media aliases linked.`);
}

// Seamless Shorts was renamed earlier; only its legacy image filenames need
// Aurora aliases. Keep its product ID, slug, colour and variants unchanged.
const shortsRecords = await query({ select: columns, slug: "eq.seamless-short-aurora" });
if (shortsRecords.length !== 1 || shortsRecords[0].color !== "Aurora" ||
    shortsRecords[0].product_variants.filter(variant => variant.active).some(variant => !variant.sku.startsWith("IGN-LVR-SHTS-JAC-"))) {
  throw new Error("Seamless Shorts Aurora needs manual review");
}
const shorts = shortsRecords[0];
const replaceMediaName = path => path.replace("-jacaranda-", "-aurora-");
if (shorts.image_path.includes("-jacaranda-")) {
  const gallery = shorts.gallery.map(item => ({ ...item, image: replaceMediaName(item.image), alt: renameText(item.alt) }));
  const updated = await query({ select: columns, id: `eq.${shorts.id}`, slug: "eq.seamless-short-aurora", color: "eq.Aurora",
    image_path: `eq.${shorts.image_path}` }, "PATCH", { image_path: replaceMediaName(shorts.image_path), gallery });
  if (updated.length !== 1 || updated[0].id !== shorts.id ||
      variantSignature(updated[0].product_variants) !== variantSignature(shorts.product_variants)) {
    throw new Error("Seamless Shorts media alias verification failed");
  }
  console.log("Seamless Shorts Aurora image URLs updated; variants unchanged.");
}
