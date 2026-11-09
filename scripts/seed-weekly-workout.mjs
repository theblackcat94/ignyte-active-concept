// Seed the approved workout as an editable, unpublished Journal draft.
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in the environment.
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase environment is not configured");

const article = JSON.parse(await readFile(new URL("../content/journal/built-for-the-burn-weekly-workout.json", import.meta.url), "utf8"));
if (article.status !== "draft" || article.publish_at !== null) throw new Error("Seed content must remain unpublished");
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: existing, error: existingError } = await db.from("journal_articles")
  .select("id,status").eq("slug", article.slug).maybeSingle();
if (existingError) throw existingError;
if (existing?.status === "published") throw new Error("Refusing to replace a published article");

const { data: category, error: categoryError } = await db.from("journal_categories")
  .upsert({ slug: "training-movement", name: "TRAINING & MOVEMENT_", description: "Practical training guidance and movement ideas.", sort_order: 3 }, { onConflict: "slug" })
  .select("id").single();
if (categoryError) throw categoryError;

const { category_slug, ...fields } = article;
if (category_slug !== "training-movement") throw new Error("Unexpected category");
const { data: saved, error: saveError } = await db.from("journal_articles")
  .upsert({ ...fields, category_id: category.id, ...(existing?.id ? { id: existing.id } : {}), updated_at: new Date().toISOString() }, { onConflict: "slug" })
  .select("id,slug,status,category_id").single();
if (saveError) throw saveError;
console.log(JSON.stringify(saved));
