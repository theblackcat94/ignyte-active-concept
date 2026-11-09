// Correct only products assigned to Mel in the shared model-details mapping.
// Run with --apply after a dry run. Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const source = await readFile(new URL("../data/model-details.ts", import.meta.url), "utf8");
const canonicalMatch = source.match(/const mel = ("[^"\r\n]+");/);
if (!canonicalMatch) throw new Error("Shared Mel details were not found");
const canonical = JSON.parse(canonicalMatch[1]);
if (!canonical.includes("Wears: Medium in tops and bottoms")) throw new Error("Shared Mel size has not been corrected");
const slugs = [...source.matchAll(/"([a-z0-9-]+)": mel,/g)].map(match => match[1]);
if (slugs.length < 10) throw new Error("Unexpected Mel product mapping");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase environment is not configured");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: products, error } = await db.from("products").select("id,slug,pdp_content").in("slug", slugs);
if (error) throw error;
if (products.length !== slugs.length) throw new Error("Some mapped Mel products are missing from the catalog");

const changes = products.map(product => {
  const current = product.pdp_content?.model_details || "";
  if (current && (!/^Mel(?:\s|$)/.test(current) || !/Wears: (?:Small|Medium) in tops and bottoms/.test(current))) {
    throw new Error(`Unexpected model details on ${product.slug}`);
  }
  const next = current ? current.replace("Wears: Small in tops and bottoms", "Wears: Medium in tops and bottoms") : canonical;
  return { ...product, next };
}).filter(product => product.pdp_content?.model_details !== product.next);
console.log(JSON.stringify({ matched: products.length, changes: changes.length, slugs: changes.map(change => change.slug), mode: process.argv.includes("--apply") ? "apply" : "dry-run" }));
if (!process.argv.includes("--apply")) process.exit(0);

for (const change of changes) {
  const { error: updateError } = await db.from("products")
    .update({ pdp_content: { ...change.pdp_content, model_details: change.next } })
    .eq("id", change.id);
  if (updateError) throw updateError;
}
const { data: confirmed, error: confirmError } = await db.from("products").select("slug,pdp_content").in("slug", slugs);
if (confirmError) throw confirmError;
if (!confirmed.every(product => product.pdp_content?.model_details?.includes("Wears: Medium in tops and bottoms"))) {
  throw new Error("Mel size verification failed");
}
console.log(`Verified ${confirmed.length} Mel product records`);
