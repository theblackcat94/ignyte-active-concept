import type { MetadataRoute } from "next";
import { journalArticles, journalVisibility, articleIsVisible } from "@/lib/journal";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://dev.ignyteactive.com";
  const core = ["/", "/shop/", "/about/", "/size-guide/", "/contact/"].map(path => ({ url: new URL(path, base).toString() }));
  if (await journalVisibility() !== "public") return core;
  const articles = (await journalArticles().catch(() => [])).filter(articleIsVisible);
  return [...core, { url: new URL("/journal/", base).toString() }, ...articles.map(article => ({ url: new URL(`/journal/${article.slug}/`, base).toString(), lastModified: article.updated_at }))];
}
