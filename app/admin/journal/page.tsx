"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminToolsNav from "@/components/admin-tools-nav";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import type { JournalArticle, JournalArticleInput, JournalBlock, JournalCategory } from "@/lib/journal";
import "../admin.css";
import "./journal-admin.css";

const blank: JournalArticleInput = { slug: "", title: "", excerpt: "", category_id: null, status: "draft", publish_at: null, featured: false, sort_order: 0, author: "", cover_url: "", cover_alt: "", thumbnail_url: "", body: [], seo_title: "", seo_description: "", canonical_url: "", og_image: "", social_title: "", social_description: "", press_publication: "", press_date: null, press_url: "" };
const newBlock = (type: JournalBlock["type"]): JournalBlock => type === "image" || type === "video" ? { type, url: "", alt: "" } : type === "list" ? { type, text: "", ordered: false } : { type, text: "" };

export default function AdminJournalPage() {
  const [token, setToken] = useState<string | null>(null);
  const [articles, setArticles] = useState<JournalArticle[]>([]);
  const [categories, setCategories] = useState<JournalCategory[]>([]);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [selected, setSelected] = useState<JournalArticleInput>({ ...blank });
  const [category, setCategory] = useState({ id: "", slug: "", name: "", description: "", sort_order: 0 });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState("");
  useEffect(() => {
    if (!commerceConfigured) return;
    const db = browserDb();
    const refresh = async () => setToken((await db.auth.getSession()).data.session?.access_token ?? null);
    void refresh();
    const { data } = db.auth.onAuthStateChange(() => { setTimeout(() => void refresh(), 0); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (token) void load(token); }, [token]);
  async function load(accessToken: string) {
    const response = await fetch("/api/admin/journal", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not load Journal"); return; }
    setArticles(result.articles); setCategories(result.categories); setVisibility(result.visibility);
  }
  async function send(payload: object) {
    if (!token) return null;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/journal", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) });
      const result = await response.json();
      setMessage(response.ok ? "Saved." : result.error || "Save failed.");
      if (response.ok) await load(token);
      return response.ok ? result : null;
    } finally { setBusy(false); }
  }
  async function saveArticle(event: React.FormEvent) {
    event.preventDefault();
    const result = await send({ kind: "article", article: selected });
    if (result) setSelected(current => ({ ...current, id: result.id }));
  }
  async function upload(file: File, target: "cover" | "thumbnail" | "og" | number) {
    if (!token) return;
    setUploading(String(target));
    const body = new FormData(); body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
    const result = await response.json(); setUploading("");
    if (!response.ok) { setMessage(result.error || "Upload failed"); return; }
    if (target === "cover") setSelected(current => ({ ...current, cover_url: result.url }));
    else if (target === "thumbnail") setSelected(current => ({ ...current, thumbnail_url: result.url }));
    else if (target === "og") setSelected(current => ({ ...current, og_image: result.url }));
    else setSelected(current => ({ ...current, body: current.body.map((block, i) => i === target && block.type === "image" ? { ...block, url: result.url } : block) }));
    setMessage("Image uploaded. Save the article to keep this change.");
  }
  function updateBlock(index: number, block: JournalBlock) { setSelected(current => ({ ...current, body: current.body.map((item, i) => i === index ? block : item) })); }
  function formatBlock(index: number, style: "bold" | "italic" | "link") {
    const block = selected.body[index];
    const field = document.getElementById(`journal-block-${index}`) as HTMLTextAreaElement | null;
    if (!block || !("text" in block) || !field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selectedText = block.text.slice(start, end) || "text";
    const replacement = style === "bold" ? `**${selectedText}**` : style === "italic" ? `*${selectedText}*` : `[${selectedText}](/shop/)`;
    updateBlock(index, { ...block, text: block.text.slice(0, start) + replacement + block.text.slice(end) });
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start, start + replacement.length); });
  }
  function moveBlock(index: number, direction: number) { setSelected(current => { const body = [...current.body]; const next = index + direction; if (next < 0 || next >= body.length) return current; [body[index], body[next]] = [body[next], body[index]]; return { ...current, body }; }); }
  if (!commerceConfigured || !token) return <main className="admin-page section-wrap"><h1>JOURNAL.</h1><p>Sign in with a team account.</p><Link href="/account/">GO TO ACCOUNT ↗</Link></main>;
  return <main className="admin-page section-wrap journal-admin"><div className="breadcrumb"><Link href="/admin/">ADMIN</Link><span>/</span><span>JOURNAL</span></div>
    <div className="admin-title"><div><span className="eyebrow">IGNYTE / EDITORIAL</span><h1>JOURNAL<span>.</span></h1><p>Stories remain staff-only until visibility is changed.</p></div><button className="button button-dark" onClick={() => setSelected({ ...blank, body: [] })}>NEW ARTICLE +</button></div><AdminToolsNav />
    {message && <p role="status" className="admin-message">{message}</p>}
    <section className="journal-admin-settings"><h2>JOURNAL VISIBILITY</h2><p>Private is the default. Public shows only published articles whose scheduled time has arrived.</p><select aria-label="Journal visibility" value={visibility} onChange={event => setVisibility(event.target.value as "private" | "public")}><option value="private">Private / Staff Only</option><option value="public">Public</option></select><button type="button" disabled={busy} onClick={() => { if (visibility === "public" && !window.confirm("Make the Journal public? Published articles will become visible and indexable.")) return; void send({ kind: "visibility", visibility }); }}>SAVE VISIBILITY</button></section>
    <section className="journal-admin-categories"><h2>CATEGORIES</h2><div className="journal-admin-category-list">{categories.map(item => <button key={item.id} type="button" onClick={() => setCategory({ ...item })}>{item.name}</button>)}<button type="button" onClick={() => setCategory({ id: "", slug: "", name: "", description: "", sort_order: categories.length })}>+ NEW CATEGORY</button></div><form onSubmit={event => { event.preventDefault(); void send({ kind: "category", category: { ...category, id: category.id || undefined } }); }} className="journal-admin-category-form"><input aria-label="Category name" placeholder="Category name" required value={category.name} onChange={event => setCategory(current => ({ ...current, name: event.target.value }))} /><input aria-label="Category slug" placeholder="category-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={category.slug} onChange={event => setCategory(current => ({ ...current, slug: event.target.value }))} /><input aria-label="Category description" placeholder="Description" value={category.description} onChange={event => setCategory(current => ({ ...current, description: event.target.value }))} /><input aria-label="Category order" type="number" value={category.sort_order} onChange={event => setCategory(current => ({ ...current, sort_order: Number(event.target.value) }))} /><button disabled={busy}>SAVE CATEGORY</button>{category.id && <button type="button" onClick={() => { if (window.confirm("Delete this category? Its articles will become uncategorised.")) void send({ kind: "delete", target: "category", id: category.id }); }}>DELETE</button>}</form></section>
    <div className="admin-layout"><div className="admin-list">{articles.map(article => <button type="button" key={article.id} className={selected.id === article.id ? "active" : ""} onClick={() => setSelected({ ...article })}><span><strong>{article.title}</strong><small>/{article.slug} · {article.status.toUpperCase()}{article.featured ? " · FEATURED" : ""}</small></span></button>)}</div>
      <form className="admin-editor" onSubmit={saveArticle}><h2>{selected.id ? "EDIT ARTICLE" : "NEW ARTICLE"}</h2><div className="admin-fields">
        <label>TITLE<input required value={selected.title} onChange={event => setSelected(current => ({ ...current, title: event.target.value }))} /></label>
        <label>SLUG<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={selected.slug} onChange={event => setSelected(current => ({ ...current, slug: event.target.value }))} /></label>
        <label className="wide">INTRODUCTORY SUMMARY<textarea rows={2} value={selected.excerpt} onChange={event => setSelected(current => ({ ...current, excerpt: event.target.value }))} /></label>
        <label>CATEGORY<select value={selected.category_id || ""} onChange={event => setSelected(current => ({ ...current, category_id: event.target.value || null }))}><option value="">Uncategorised</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>STATUS<select value={selected.status} onChange={event => setSelected(current => ({ ...current, status: event.target.value as "draft" | "published" }))}><option value="draft">Draft</option><option value="published">Published</option></select></label>
        <label>PUBLISH AT<input type="datetime-local" value={selected.publish_at?.slice(0,16) || ""} onChange={event => setSelected(current => ({ ...current, publish_at: event.target.value ? new Date(event.target.value).toISOString() : null }))} /></label>
        <label>AUTHOR (OPTIONAL)<input value={selected.author} onChange={event => setSelected(current => ({ ...current, author: event.target.value }))} /></label>
        <label>ORDER<input type="number" value={selected.sort_order} onChange={event => setSelected(current => ({ ...current, sort_order: Number(event.target.value) }))} /></label>
        <label className="admin-check"><input type="checkbox" checked={selected.featured} onChange={event => setSelected(current => ({ ...current, featured: event.target.checked }))} />FEATURED ARTICLE</label>
        {(["cover", "thumbnail", "og"] as const).map(kind => <label key={kind}>{kind.toUpperCase()} IMAGE<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, kind); }} /><input aria-label={`${kind} image URL`} placeholder="Or paste image URL" value={kind === "cover" ? selected.cover_url : kind === "thumbnail" ? selected.thumbnail_url : selected.og_image} onChange={event => setSelected(current => ({ ...current, [kind === "cover" ? "cover_url" : kind === "thumbnail" ? "thumbnail_url" : "og_image"]: event.target.value }))} /></label>)}
        <label>IMAGE ALT TEXT<input value={selected.cover_alt} onChange={event => setSelected(current => ({ ...current, cover_alt: event.target.value }))} /></label>
      </div><h3>ARTICLE BODY</h3><p className="journal-editor-help">Add and reorder blocks. Paragraphs support **bold**, *italic* and [link text](/shop/) formatting.</p>
      <div className="journal-blocks">{selected.body.map((block, index) => <div className="journal-block-editor" key={index}><div className="journal-block-head"><select aria-label={`Block ${index + 1} type`} value={block.type} onChange={event => updateBlock(index, newBlock(event.target.value as JournalBlock["type"]))}>{["paragraph","heading","quote","list","image","video"].map(type => <option key={type} value={type}>{type}</option>)}</select><button type="button" onClick={() => moveBlock(index, -1)} aria-label="Move block up">↑</button><button type="button" onClick={() => moveBlock(index, 1)} aria-label="Move block down">↓</button><button type="button" onClick={() => setSelected(current => ({ ...current, body: current.body.filter((_, i) => i !== index) }))}>REMOVE</button></div>
        {"text" in block ? <>{block.type === "paragraph" && <div className="journal-format-toolbar" aria-label={`Block ${index + 1} formatting`}><button type="button" onClick={() => formatBlock(index, "bold")} aria-label="Bold selected text"><strong>B</strong></button><button type="button" onClick={() => formatBlock(index, "italic")} aria-label="Italic selected text"><em>I</em></button><button type="button" onClick={() => formatBlock(index, "link")} aria-label="Insert link">LINK ↗</button></div>}<textarea id={`journal-block-${index}`} aria-label={`Block ${index + 1} content`} rows={block.type === "paragraph" ? 5 : 2} value={block.text} onChange={event => updateBlock(index, { ...block, text: event.target.value })} /></> : <><input aria-label={`Block ${index + 1} URL`} placeholder="Media URL" value={block.url} onChange={event => updateBlock(index, { ...block, url: event.target.value })} /><input aria-label={`Block ${index + 1} description`} placeholder="Alt text or video description" value={block.alt} onChange={event => updateBlock(index, { ...block, alt: event.target.value })} />{block.type === "image" && <input aria-label={`Upload block ${index + 1} image`} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, index); }} />}</>}
        {block.type === "list" && <label><input type="checkbox" checked={block.ordered} onChange={event => updateBlock(index, { ...block, ordered: event.target.checked })} /> Numbered list</label>}
      </div>)}</div><div className="journal-add-block">{(["paragraph","heading","quote","list","image","video"] as const).map(type => <button key={type} type="button" onClick={() => setSelected(current => ({ ...current, body: [...current.body, newBlock(type)] }))}>+ {type.toUpperCase()}</button>)}</div>
      <h3>SEO & SHARING</h3><div className="admin-fields">{(["seo_title","seo_description","canonical_url","social_title","social_description"] as const).map(key => <label key={key}>{key.replaceAll("_"," ").toUpperCase()}<input value={selected[key]} onChange={event => setSelected(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div>
      <h3>PRESS SOURCE (OPTIONAL)</h3><div className="admin-fields"><label>PUBLICATION<input value={selected.press_publication} onChange={event => setSelected(current => ({ ...current, press_publication: event.target.value }))} /></label><label>PUBLICATION DATE<input type="date" value={selected.press_date || ""} onChange={event => setSelected(current => ({ ...current, press_date: event.target.value || null }))} /></label><label className="wide">SOURCE URL<input type="url" value={selected.press_url} onChange={event => setSelected(current => ({ ...current, press_url: event.target.value }))} /></label></div>
      <div className="admin-save"><button className="button button-orange" disabled={busy || Boolean(uploading)}>{busy ? "SAVING…" : "SAVE ARTICLE"}</button>{selected.id && <><Link href={`/journal/${selected.slug}/`} target="_blank">PREVIEW ↗</Link><button type="button" className="admin-secondary" onClick={() => setSelected({ ...selected, id: undefined, slug: `${selected.slug}-copy`, title: `${selected.title} (copy)`, status: "draft", featured: false })}>DUPLICATE</button><button type="button" className="admin-secondary" onClick={() => { if (selected.id && window.confirm(`Delete ${selected.title}? This cannot be undone.`)) void send({ kind: "delete", target: "article", id: selected.id }).then(result => { if (result) setSelected({ ...blank }); }); }}>DELETE</button></>}</div>
      </form></div>
  </main>;
}
