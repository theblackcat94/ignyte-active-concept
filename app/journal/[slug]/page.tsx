import type { Metadata } from "next";
import JournalView from "@/components/journal-view";
import { journalArticles, journalVisibility, articleIsVisible } from "@/lib/journal";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const visibility = await journalVisibility();
  if (visibility === "private") return { title: "IGNYTE Journal · Staff Preview", robots: { index: false, follow: false } };
  const { slug } = await params;
  const article = (await journalArticles().catch(() => [])).find(item => item.slug === slug && articleIsVisible(item));
  if (!article) return { title: "Story unavailable", robots: { index: false, follow: false } };
  return { title: article.seo_title || article.title, description: article.seo_description || article.excerpt, alternates: { canonical: article.canonical_url || `/journal/${slug}/` }, openGraph: { title: article.social_title || article.title, description: article.social_description || article.excerpt, images: article.og_image || article.cover_url || undefined } };
}
export default async function JournalArticlePage({ params }: Props) {
  const { slug } = await params;
  const publicArticle = await journalVisibility() === "public" ? (await journalArticles().catch(() => [])).find(item => item.slug === slug && articleIsVisible(item)) : null;
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://dev.ignyteactive.com";
  const structured = publicArticle ? { "@context": "https://schema.org", "@type": "Article", headline: publicArticle.title, description: publicArticle.excerpt, image: publicArticle.cover_url ? new URL(publicArticle.cover_url, base).toString() : undefined, datePublished: publicArticle.publish_at || publicArticle.created_at, dateModified: publicArticle.updated_at, author: publicArticle.author ? { "@type": "Person", name: publicArticle.author } : { "@type": "Organization", name: "IGNYTE Active" }, publisher: { "@type": "Organization", name: "IGNYTE Active" }, mainEntityOfPage: new URL(`/journal/${slug}/`, base).toString() } : null;
  return <>{structured && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />}<JournalView slug={slug} /></>;
}
