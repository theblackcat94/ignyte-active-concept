// Inspect Journal readiness, then optionally publish explicit slugs and open the index.
// Usage: node scripts/journal-publication.mjs --env-file /path/to/env [--apply --publish=slug,slug]
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const envIndex = args.indexOf("--env-file");
if (envIndex < 0 || !args[envIndex + 1]) throw new Error("Pass --env-file /path/to/env");
for (const line of readFileSync(args[envIndex + 1], "utf8").split(/\r?\n/)) {
  const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
  if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const [{ data: settings, error: settingsError }, { data: articles, error: articlesError }] = await Promise.all([
  db.from("journal_settings").select("visibility").eq("id", true).single(),
  db.from("journal_articles").select("id,slug,title,status,publish_at,cover_url,thumbnail_url,body,seo_title,seo_description").order("sort_order"),
]);
if (settingsError || articlesError) throw settingsError || articlesError;
const summary = articles.map(article => ({ slug: article.slug, title: article.title, status: article.status, publish_at: article.publish_at, has_cover: Boolean(article.cover_url), has_thumbnail: Boolean(article.thumbnail_url), blocks: Array.isArray(article.body) ? article.body.length : 0, has_seo: Boolean(article.seo_title && article.seo_description) }));
console.log(JSON.stringify({ visibility: settings.visibility, articles: summary }, null, 2));
if (!args.includes("--apply")) process.exit(0);
const publish = args.find(arg => arg.startsWith("--publish="))?.slice(10).split(",").filter(Boolean) || [];
if (!publish.length || publish.some(slug => !articles.some(article => article.slug === slug))) throw new Error("Pass known article slugs with --publish=slug,slug");
const now = new Date().toISOString();
for (const slug of publish) {
  const article = articles.find(item => item.slug === slug);
  if (!article.cover_url || !article.seo_title || !article.seo_description || !Array.isArray(article.body) || !article.body.length) throw new Error(`Article ${slug} is incomplete`);
  const { error } = await db.from("journal_articles").update({ status: "published", publish_at: now, updated_at: now }).eq("id", article.id);
  if (error) throw error;
  console.log(`Published ${slug}`);
}
const { error: visibilityError } = await db.from("journal_settings").update({ visibility: "public", updated_at: now }).eq("id", true);
if (visibilityError) throw visibilityError;
console.log("Journal visibility: public");
