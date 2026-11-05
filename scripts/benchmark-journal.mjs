// Compare the Journal card query with the former full-body listing query.
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { createClient } from "@supabase/supabase-js";

const envAt = process.argv.indexOf("--env-file");
if (envAt !== -1) {
  const path = process.argv[envAt + 1];
  if (!path) throw new Error("Pass an env file path");
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (match) process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const fields = "id,slug,title,excerpt,featured,cover_url,cover_alt,thumbnail_url,status,publish_at,journal_categories(name,slug)";
for (const [label, columns] of [["former full-body listing", "*,journal_categories(name,slug)"], ["card-only listing", fields]]) {
  const samples = [];
  let bytes = 0;
  let count = 0;
  for (let i = 0; i < 4; i++) {
    const start = performance.now();
    const { data, error } = await db.from("journal_articles").select(columns).order("sort_order").order("created_at", { ascending: false });
    if (error) throw error;
    if (i) samples.push(Math.round(performance.now() - start));
    bytes = Buffer.byteLength(JSON.stringify(data));
    count = data.length;
  }
  samples.sort((a, b) => a - b);
  console.log(`${label}: ${count} articles, ${bytes} JSON bytes, median warm query ${samples[1]} ms`);
}
