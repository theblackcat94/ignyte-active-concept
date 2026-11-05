import { NextResponse } from "next/server";
import { journalArticles, journalCategories, journalVisibility, articleIsVisible } from "@/lib/journal";
import { verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const [visibility, staff] = await Promise.all([journalVisibility(), verifiedStaff(request)]);
  if (visibility !== "public" && !staff) return NextResponse.json({ error: "Journal is private" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  try {
    const [all, categories] = await Promise.all([journalArticles(), journalCategories()]);
    const articles = staff ? all : all.filter(articleIsVisible);
    const slug = new URL(request.url).searchParams.get("slug");
    if (slug) {
      const article = articles.find(item => item.slug === slug);
      return article ? NextResponse.json({ article, related: articles.filter(item => item.slug !== slug).slice(0, 2), categories, visibility }, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ articles, categories, visibility }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Journal is unavailable" }, { status: 503 });
  }
}
