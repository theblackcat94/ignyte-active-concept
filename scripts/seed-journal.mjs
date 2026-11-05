// Idempotently seed the three editorial launch drafts. Dry run unless --apply is passed.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const envAt = process.argv.indexOf("--env-file");
if (envAt !== -1) {
  const file = process.argv[envAt + 1];
  if (!file) throw new Error("Pass an env file path");
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase settings are required");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const launch = JSON.parse(readFileSync(new URL("../data/journal-launch.json", import.meta.url), "utf8"));
const { data: categories, error: categoryError } = await db.from("journal_categories").select("id,slug");
if (categoryError) throw categoryError;
const { data: existing, error: articleError } = await db.from("journal_articles").select("slug");
if (articleError) throw articleError;
for (const [index, item] of launch.entries()) {
  if (existing.some(article => article.slug === item.slug)) { console.log(`Keep existing ${item.slug}`); continue; }
  const category = categories.find(value => value.slug === item.category);
  if (!category) throw new Error(`Missing category ${item.category}`);
  const { category: ignored, ...record } = item;
  void ignored;
  console.log(`${apply ? "Create" : "Would create"} private draft ${item.slug} (${item.body.length} blocks)`);
  if (apply) {
    const { error } = await db.from("journal_articles").insert({ ...record, category_id: category.id, status: "draft", publish_at: null, sort_order: index, thumbnail_url: item.cover_url, seo_title: item.title, og_image: item.cover_url, social_title: item.title, social_description: item.seo_description });
    if (error) throw error;
  }
}
