import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";
import { journalArticleSchema, journalArticles, journalCategories, journalVisibility, safeJournalUrl } from "@/lib/journal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const categoryInput = z.object({ id: z.string().uuid().optional(), slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/), name: z.string().trim().min(1).max(100), description: z.string().max(500), sort_order: z.number().int() });

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const [articles, categories, visibility] = await Promise.all([journalArticles(), journalCategories(), journalVisibility()]);
    return NextResponse.json({ articles, categories, visibility }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Journal database unavailable" }, { status: 503 }); }
}

export async function POST(request: Request) {
  const staff = await verifiedStaff(request);
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const payload = await request.json().catch(() => null);
  const db = adminDb();
  if (payload?.kind === "visibility") {
    const parsed = z.enum(["private", "public"]).safeParse(payload.visibility);
    if (!parsed.success) return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
    const { error } = await db.from("journal_settings").update({ visibility: parsed.data, updated_at: new Date().toISOString() }).eq("id", true);
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  if (payload?.kind === "category") {
    const parsed = categoryInput.safeParse(payload.category);
    if (!parsed.success) return NextResponse.json({ error: "Check the category fields" }, { status: 400 });
    const { id, ...record } = parsed.data;
    const query = id ? db.from("journal_categories").update(record).eq("id", id) : db.from("journal_categories").insert(record);
    const { data, error } = await query.select("*").single();
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
  }
  if (payload?.kind === "delete") {
    const parsed = z.object({ id: z.string().uuid(), target: z.enum(["article", "category"]) }).safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "Invalid delete request" }, { status: 400 });
    const table = parsed.data.target === "article" ? "journal_articles" : "journal_categories";
    const { error } = await db.from(table).delete().eq("id", parsed.data.id);
    return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json({ ok: true });
  }
  const parsed = journalArticleSchema.safeParse(payload?.article);
  if (!parsed.success) return NextResponse.json({ error: "Check the article fields and content blocks" }, { status: 400 });
  const { id, ...article } = parsed.data;
  const urls = [article.cover_url, article.thumbnail_url, article.canonical_url, article.og_image, article.press_url, ...article.body.filter(block => block.type === "image" || block.type === "video").map(block => block.url)];
  if (urls.some(url => !safeJournalUrl(url))) return NextResponse.json({ error: "Use relative or HTTPS media links" }, { status: 400 });
  const record = { ...article, publish_at: article.status === "published" ? article.publish_at || new Date().toISOString() : article.publish_at, updated_at: new Date().toISOString() };
  const query = id ? db.from("journal_articles").update(record).eq("id", id) : db.from("journal_articles").insert(record);
  const { data, error } = await query.select("*").single();
  return error ? NextResponse.json({ error: error.message }, { status: 400 }) : NextResponse.json(data);
}
