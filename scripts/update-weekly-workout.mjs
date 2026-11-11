// Apply only the approved SEO and closing CTA edits to the unpublished workout draft.
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const envPath = process.argv[2];
if (!envPath) throw new Error("Pass the owner-controlled environment file path");
const settings = Object.fromEntries((await readFile(envPath, "utf8")).split(/\r?\n/)
  .filter(line => line && !line.startsWith("#") && line.includes("="))
  .map(line => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]));
const db = createClient(settings.NEXT_PUBLIC_SUPABASE_URL, settings.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const approved = JSON.parse(await readFile(new URL("../content/journal/built-for-the-burn-weekly-workout.json", import.meta.url), "utf8"));
const { data: current, error } = await db.from("journal_articles")
  .select("id,slug,status,publish_at,body,seo_title,seo_description,social_title,social_description")
  .eq("slug", approved.slug).maybeSingle();
if (error) throw error;
if (!current) throw new Error("Workout draft is missing; seed it separately before updating");
if (current.status !== "draft" || current.publish_at !== null) throw new Error("Refusing to change a published article");

const oldTail = [
  "[SHOP IGNYTE ↗](/shop/)  ·  [FIND YOUR FIT ↗](/size-guide/)",
  "MOVE WITH PURPOSE. TRAIN WITH FIRE.",
  "IGNYTE ACTIVE · BUILT FOR THE BURN™",
];
const newTail = approved.body.at(-1).text;
const body = [...current.body];
if (oldTail.every((text, index) => body.at(index - oldTail.length)?.type === "paragraph" && body.at(index - oldTail.length)?.text === text)) {
  body.splice(-oldTail.length, oldTail.length, { type: "paragraph", text: newTail });
} else if (body.at(-1)?.type !== "paragraph" || body.at(-1)?.text !== newTail) {
  throw new Error("Workout draft closing blocks changed; review the current article before updating");
}
const update = { body, seo_title: approved.seo_title, seo_description: approved.seo_description,
  social_title: approved.social_title, social_description: approved.social_description, updated_at: new Date().toISOString() };
const { data: saved, error: saveError } = await db.from("journal_articles").update(update).eq("id", current.id)
  .select("slug,status,publish_at,seo_title,seo_description,social_title,social_description,body").single();
if (saveError) throw saveError;
console.log(JSON.stringify({ slug: saved.slug, status: saved.status, publish_at: saved.publish_at,
  seo_title: saved.seo_title, seo_description: saved.seo_description,
  social_title: saved.social_title, social_description: saved.social_description, final_blocks: saved.body.slice(-2) }));
