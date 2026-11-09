import { NextResponse } from "next/server";
import { journalCardColumns, journalCategories, journalVisibility, articleIsVisible, type JournalArticle, type JournalCard } from "@/lib/journal";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asCards(rows: unknown): JournalCard[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => ({ ...row, journal_categories: Array.isArray(row.journal_categories) ? row.journal_categories[0] || null : row.journal_categories })) as JournalCard[];
}

export async function GET(request: Request) {
  const [visibility, staff] = await Promise.all([journalVisibility(), verifiedStaff(request)]);
  if (visibility !== "public" && !staff) return NextResponse.json({ error: "Journal is private" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  try {
    const db = adminDb();
    const slug = new URL(request.url).searchParams.get("slug");
    if (slug) {
      const [articleResult, relatedResult, categories] = await Promise.all([
        db.from("journal_articles").select("*,journal_categories(name,slug)").eq("slug", slug).maybeSingle(),
        db.from("journal_articles").select(journalCardColumns).neq("slug", slug).order("sort_order").order("created_at", { ascending: false }).limit(6),
        journalCategories(),
      ]);
      if (articleResult.error || relatedResult.error) throw articleResult.error || relatedResult.error;
      const article = articleResult.data as JournalArticle | null;
      if (!article || (!staff && !articleIsVisible(article))) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const related = asCards(relatedResult.data).filter(item => staff || articleIsVisible(item)).slice(0, 2);
      return NextResponse.json({ article, related, categories, visibility }, { headers: { "Cache-Control": "no-store" } });
    }
    const [cardsResult, categories] = await Promise.all([db.from("journal_articles").select(journalCardColumns).order("sort_order").order("created_at", { ascending: false }), journalCategories()]);
    if (cardsResult.error) throw cardsResult.error;
    const articles = asCards(cardsResult.data).filter(item => staff || articleIsVisible(item));
    const visibleCategories = staff ? categories : categories.filter(category =>
      articles.some(article => article.journal_categories?.slug === category.slug));
    return NextResponse.json({ articles, categories: visibleCategories, visibility }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Journal is unavailable" }, { status: 503 });
  }
}
