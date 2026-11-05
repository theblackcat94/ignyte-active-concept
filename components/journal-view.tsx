"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import { NewsletterSignup } from "@/components/footer";
import type { JournalArticle, JournalBlock, JournalCategory } from "@/lib/journal";
import "@/app/journal/journal.css";

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return <>{parts.map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) return link[2].startsWith("/") && !link[2].startsWith("//") ? <Link href={link[2]} key={index}>{link[1]}</Link> : /^https:\/\//.test(link[2]) ? <a href={link[2]} key={index} target="_blank" rel="noopener noreferrer">{link[1]}</a> : part;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  })}</>;
}

function BodyBlock({ block }: { block: JournalBlock }) {
  if (block.type === "heading") return <h2>{block.text}</h2>;
  if (block.type === "quote") return <blockquote>{block.text}</blockquote>;
  if (block.type === "image") return <figure><img src={block.url} alt={block.alt} loading="lazy" /></figure>;
  if (block.type === "video") return <video src={block.url} aria-label={block.alt} controls preload="none" playsInline />;
  if (block.type === "list") {
    const entries = block.text.split("\n").filter(Boolean).map((entry, i) => <li key={i}><Inline text={entry} /></li>);
    return block.ordered ? <ol>{entries}</ol> : <ul>{entries}</ul>;
  }
  return <p><Inline text={block.text} /></p>;
}

function JournalSignup() {
  return <aside className="journal-signup"><div><span className="journal-eyebrow">JOIN THE FIRE_</span><h2>More from IGNYTE.</h2><p>Brand stories, new drops and what comes next.</p></div><NewsletterSignup idPrefix="journal" /></aside>;
}

const needsRawImage = (url: string) => url.startsWith("https://") && !url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL || ""}/storage/v1/object/public/product-media/`);

function Card({ article, large = false }: { article: JournalArticle; large?: boolean }) {
  return <article className={`journal-card${large ? " journal-featured" : ""}`}>
    <Link href={`/journal/${article.slug}/`} className="journal-card-image">{article.thumbnail_url || article.cover_url ? <Image src={article.thumbnail_url || article.cover_url} alt={article.cover_alt} fill sizes={large ? "(max-width: 800px) 100vw, 65vw" : "(max-width: 800px) 100vw, 50vw"} priority={large} unoptimized={needsRawImage(article.thumbnail_url || article.cover_url)} /> : <span className="journal-card-placeholder">IGNYTE</span>}</Link>
    <div className="journal-card-copy"><span className="journal-eyebrow">{article.journal_categories?.name || "THE LATEST_"}</span><h2><Link href={`/journal/${article.slug}/`}>{article.title}</Link></h2><p>{article.excerpt}</p><Link href={`/journal/${article.slug}/`} className="journal-cta">READ STORY ↗</Link></div>
  </article>;
}

export default function JournalView({ slug }: { slug?: string }) {
  const [data, setData] = useState<{ articles: JournalArticle[]; categories: JournalCategory[]; visibility: string } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const token = commerceConfigured ? (await browserDb().auth.getSession()).data.session?.access_token : null;
      const response = await fetch(`/api/journal${slug ? `?slug=${encodeURIComponent(slug)}` : ""}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (cancelled) return;
      if (!response.ok) setError(response.status === 403 ? "The Journal is in private staff review. Sign in with a team account to preview it." : result.error || "Journal unavailable.");
      else setData(slug ? { articles: [result.article, ...(result.related || [])], categories: result.categories, visibility: result.visibility } : result);
      setLoading(false);
    }
    void load();
    if (!commerceConfigured) return () => { cancelled = true; };
    const { data: auth } = browserDb().auth.onAuthStateChange(() => { setTimeout(() => { if (!cancelled) { setLoading(true); setError(""); void load(); } }, 0); });
    return () => { cancelled = true; auth.subscription.unsubscribe(); };
  }, [slug]);
  if (loading) return <section className="journal-page journal-gate" aria-busy="true"><span className="journal-eyebrow">STORIES / NEWS / PRESS_</span><h1>THE IGNYTE JOURNAL_</h1><p>Loading the Journal…</p></section>;
  if (error || !data) return <section className="journal-page journal-gate"><span className="journal-eyebrow">STORIES / NEWS / PRESS_</span><h1>THE IGNYTE JOURNAL_</h1><p>{error || "Journal unavailable."}</p><Link className="journal-cta" href="/account/">TEAM SIGN IN ↗</Link></section>;
  if (slug) {
    const article = data.articles[0];
    if (!article) return <section className="journal-page journal-gate"><h1>Story unavailable.</h1></section>;
    const related = data.articles.filter(item => item.slug !== slug).slice(0, 2);
    return <div className="journal-page"><article className="journal-article">
      <header className="journal-article-head"><span className="journal-eyebrow">{article.journal_categories?.name || "THE LATEST_"}</span><h1>{article.title}</h1><p>{article.excerpt}</p><div className="journal-date">{article.publish_at ? new Date(article.publish_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "DRAFT PREVIEW"}{article.author ? ` · ${article.author}` : ""}</div>{article.press_publication && <p className="journal-press-source">Originally published by {article.press_url ? <a href={article.press_url} target="_blank" rel="noopener noreferrer">{article.press_publication} ↗</a> : article.press_publication}{article.press_date ? ` · ${new Date(`${article.press_date}T12:00:00`).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}` : ""}</p>}</header>
      {article.cover_url && <div className="journal-hero-image"><Image src={article.cover_url} alt={article.cover_alt} fill sizes="100vw" priority unoptimized={needsRawImage(article.cover_url)} /></div>}
      <div className="journal-article-body">{article.body.map((block, index) => <BodyBlock key={index} block={block} />)}</div>
    </article><div className="journal-after"><Link href="/journal/" className="journal-cta">BACK TO JOURNAL ↗</Link></div>{related.length > 0 && <section className="journal-related"><span className="journal-eyebrow">READ NEXT_</span><div className="journal-grid">{related.map(item => <Card key={item.id} article={item} />)}</div></section>}<JournalSignup /></div>;
  }
  const visible = data.articles.filter(item => filter === "all" || item.journal_categories?.slug === filter);
  const featured = visible.find(item => item.featured) || visible[0];
  return <div className="journal-page"><header className="journal-index-head"><span className="journal-eyebrow">STORIES / NEWS / PRESS_</span><h1>THE IGNYTE JOURNAL_</h1><p>A closer look at the people, products and ideas behind IGNYTE.</p>{data.visibility === "private" && <small className="journal-private">STAFF PREVIEW · NOT PUBLIC</small>}</header>
    <nav className="journal-filters" aria-label="Journal categories"><button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>ALL STORIES</button>{data.categories.map(category => <button key={category.id} type="button" aria-pressed={filter === category.slug} onClick={() => setFilter(category.slug)}>{category.name}</button>)}</nav>
    {featured ? <><Card article={featured} large /><div className="journal-grid">{visible.filter(item => item.id !== featured.id).map(item => <Card key={item.id} article={item} />)}</div></> : <p className="journal-empty">No stories in this category yet.</p>}
    <JournalSignup />
  </div>;
}
