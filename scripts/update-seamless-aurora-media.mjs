// Update only the existing Aurora listing's imagery after validating its identity.
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const envIndex = args.indexOf("--env-file");
if (envIndex >= 0) {
  const file = args[envIndex + 1];
  if (!file) throw new Error("--env-file needs a path");
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const at = line.indexOf("=");
    if (at > 0) process.env[line.slice(0, at)] = line.slice(at + 1);
  }
}
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Missing staging database configuration");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } });
const checked = (result, label) => { if (result.error) throw new Error(`${label}: ${result.error.message}`); return result.data; };
const product = checked(await db.from("products").select("id,slug,name,category,color,image_path,gallery,product_variants(sku)").eq("slug","seamless-short-aurora").single(),"Load Aurora");
const expectedSkus = ["IGN-LVR-SHTS-JAC-L", "IGN-LVR-SHTS-JAC-M", "IGN-LVR-SHTS-JAC-S"];
if (product.name !== "Seamless Shorts" || product.category !== "shorts" || product.color !== "Aurora" ||
  JSON.stringify(product.product_variants.map(v => v.sku).sort()) !== JSON.stringify(expectedSkus)) throw new Error("Aurora identity mismatch");
const directory = "/images/jacob-2026-10/ign-lvr-shts-jac/";
const oldPrefix = `${directory}ign-lvr-shts-jac-seamless-shorts-`;
const suffixes = ["main-01", "gallery-02", "gallery-03", "gallery-05", "gallery-06"];
const replacement = suffixes.map(suffix => `${oldPrefix}aurora-hires-${suffix}.jpg`);
if (!product.image_path.includes("seamless-shorts-") || product.gallery.length !== 4 ||
  product.gallery.some((item,index) => !item.image.endsWith(`${suffixes[index+1]}.jpg`))) throw new Error("Existing gallery order differs; no update made");
for (const path of replacement) if (!existsSync(resolve("public",path.slice(1)))) throw new Error(`Missing media: ${path}`);
console.log(JSON.stringify({ slug:product.slug, previous:[product.image_path,...product.gallery.map(item=>item.image)], replacement },null,2));
if (!args.includes("--apply")) { console.log("Inspection only"); process.exit(0); }
const gallery = replacement.slice(1).map((image,index) => ({ ...product.gallery[index], image, alt:`Seamless Shorts in Aurora — gallery view ${index+2}` }));
checked(await db.from("products").update({ image_path:replacement[0], gallery }).eq("id",product.id).eq("slug","seamless-short-aurora"),"Update Aurora photos");
console.log("Aurora media updated");
