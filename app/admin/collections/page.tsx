"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminToolsNav from "@/components/admin-tools-nav";
import { browserDb, commerceConfigured, type StoreProduct } from "@/lib/commerce";
import "../admin.css";
import "../operations.css";
import "./collections-admin.css";

type CollectionForm = {
  id?: string; slug: string; name: string; description: string; cover_path: string | null; cover_alt: string;
  focal_x: number; focal_y: number; seo_title: string; seo_description: string;
  status: "draft" | "published" | "archived"; publish_at: string | null;
  mode: "manual" | "automatic"; rules: { category?: string }; product_ids: string[];
};
const blank: CollectionForm = { slug: "", name: "", description: "", cover_path: null, cover_alt: "", focal_x: 50, focal_y: 50, seo_title: "", seo_description: "", status: "draft", publish_at: null, mode: "manual", rules: {}, product_ids: [] };

export default function AdminCollectionsPage() {
  const [token, setToken] = useState<string | null>(null);
  const [items, setItems] = useState<CollectionForm[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [selected, setSelected] = useState<CollectionForm>({ ...blank });
  const [placement, setPlacement] = useState("");
  const [placementCount, setPlacementCount] = useState(12);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [dragged, setDragged] = useState<string | null>(null);
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
    const headers = { Authorization: `Bearer ${accessToken}` };
    const [collectionsResponse, productsResponse] = await Promise.all([fetch("/api/admin/collections", { headers }), fetch("/api/admin/products", { headers })]);
    if (!collectionsResponse.ok || !productsResponse.ok) { setMessage("Could not load collections. Confirm that the collections migration has been applied."); return; }
    const result = await collectionsResponse.json();
    setItems(result.collections);
    setPlacement(result.placement?.collection_id ?? "");
    setPlacementCount(result.placement?.max_products ?? 12);
    setProducts(await productsResponse.json());
  }
  async function upload(file: File) {
    if (!token) return;
    setBusy(true);
    const body = new FormData(); body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(result.error || "Upload failed."); return; }
    setSelected(current => ({ ...current, cover_path: result.url }));
    setMessage("Cover uploaded. Save the collection to publish it.");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!token) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/collections", { method: selected.id ? "PUT" : "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(selected) });
    const result = await response.json(); setBusy(false);
    if (!response.ok) { setMessage(result.error || "Save failed."); return; }
    setSelected(current => ({ ...current, id: result.id }));
    setMessage("Collection saved."); await load(token);
    window.dispatchEvent(new Event("ignyte:collections-changed"));
  }
  async function setHomePlacement() {
    if (!token || !placement) return;
    setBusy(true);
    const response = await fetch("/api/admin/collections", { method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ collection_id: placement, max_products: placementCount }) });
    setBusy(false); setMessage(response.ok ? "Homepage collection updated." : "Could not update homepage collection.");
    if (response.ok) window.dispatchEvent(new Event("ignyte:collections-changed"));
  }
  async function remove() {
    if (!token || !selected.id || !window.confirm(`Delete ${selected.name}? Its product records will remain untouched.`)) return;
    setBusy(true);
    const response = await fetch("/api/admin/collections", { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: selected.id }) });
    setBusy(false); setMessage(response.ok ? "Collection deleted." : "Could not delete collection.");
    if (response.ok) { setSelected({ ...blank }); await load(token); window.dispatchEvent(new Event("ignyte:collections-changed")); }
  }
  const matching = products.filter(product => product.status === "active" && `${product.name} ${product.color} ${product.slug}`.toLowerCase().includes(search.toLowerCase())).slice(0, 35);
  const chosen = selected.product_ids.map(id => products.find(product => product.id === id)).filter((product): product is StoreProduct => Boolean(product));
  if (!commerceConfigured || !token) return <main className="admin-page section-wrap"><h1>COLLECTIONS.</h1><p>Sign in with a team account.</p><Link href="/account">GO TO ACCOUNT ↗</Link></main>;
  return <main className="admin-page section-wrap"><div className="breadcrumb"><Link href="/admin">ADMIN</Link><span>/</span><span>COLLECTIONS</span></div><div className="admin-title"><div><span className="eyebrow">IGNYTE / CURATION</span><h1>COLLECTIONS<span>.</span></h1><p>Curated product groups are separate from Shop categories.</p></div><button className="button button-dark" onClick={() => setSelected({ ...blank })}>NEW COLLECTION +</button></div><AdminToolsNav />
    {message && <p role="status" className="admin-message">{message}</p>}
    <div className="admin-collection-placement"><label>HOMEPAGE · THE IGNYTE EDIT <select value={placement} onChange={event => setPlacement(event.target.value)}><option value="">Choose a published collection</option>{items.filter(item => item.status === "published").map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>MAX PRODUCTS<input type="number" min="1" max="24" value={placementCount} onChange={event => setPlacementCount(Number(event.target.value))} /></label><button type="button" className="admin-secondary" disabled={busy || !placement} onClick={() => void setHomePlacement()}>SAVE PLACEMENT</button></div>
    <div className="admin-layout"><div className="admin-list">{items.map(item => <button type="button" key={item.id} className={selected.id === item.id ? "active" : ""} onClick={() => setSelected({ ...item })}><span><strong>{item.name}</strong><small>/{item.slug} · {item.status.toUpperCase()} · {item.product_ids.length} products</small></span></button>)}</div>
      <form className="admin-editor" onSubmit={save}><h2>{selected.id ? "EDIT COLLECTION" : "NEW COLLECTION"}</h2><div className="admin-fields">
        <label>NAME<input required value={selected.name} onChange={event => setSelected(current => ({ ...current, name: event.target.value }))} /></label>
        <label>SLUG<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={selected.slug} onChange={event => setSelected(current => ({ ...current, slug: event.target.value }))} /></label>
        <label className="wide">DESCRIPTION<textarea rows={3} value={selected.description} onChange={event => setSelected(current => ({ ...current, description: event.target.value }))} /></label>
        <div className="admin-cover-field wide"><strong>COLLECTION COVER</strong>{selected.cover_path && <img src={selected.cover_path} alt={selected.cover_alt || "Collection cover preview"} style={{ objectPosition: `${selected.focal_x}% ${selected.focal_y}%` }} />}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload collection cover" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} /><small>Recommended 1920 × 600 px. JPG, PNG or WebP.</small>{selected.cover_path && <button type="button" className="admin-secondary" onClick={() => setSelected(current => ({ ...current, cover_path: null }))}>REMOVE COVER</button>}</div>
        <label className="wide">COVER ALT TEXT<input value={selected.cover_alt} onChange={event => setSelected(current => ({ ...current, cover_alt: event.target.value }))} /></label>
        <label>HORIZONTAL FOCAL POINT ({selected.focal_x}%)<input type="range" min="0" max="100" value={selected.focal_x} onChange={event => setSelected(current => ({ ...current, focal_x: Number(event.target.value) }))} /></label>
        <label>VERTICAL FOCAL POINT ({selected.focal_y}%)<input type="range" min="0" max="100" value={selected.focal_y} onChange={event => setSelected(current => ({ ...current, focal_y: Number(event.target.value) }))} /></label>
        <label>SEO TITLE<input value={selected.seo_title} onChange={event => setSelected(current => ({ ...current, seo_title: event.target.value }))} /></label>
        <label>SEO DESCRIPTION<input value={selected.seo_description} onChange={event => setSelected(current => ({ ...current, seo_description: event.target.value }))} /></label>
        <label>STATUS<select value={selected.status} onChange={event => setSelected(current => ({ ...current, status: event.target.value as CollectionForm["status"] }))}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label>MODE<select value={selected.mode} onChange={event => setSelected(current => ({ ...current, mode: event.target.value as CollectionForm["mode"] }))}><option value="manual">Manual order</option><option value="automatic">Automatic category</option></select></label>
        <label>PUBLISH AT<input type="datetime-local" value={selected.publish_at?.slice(0, 16) ?? ""} onChange={event => setSelected(current => ({ ...current, publish_at: event.target.value ? new Date(event.target.value).toISOString() : null }))} /></label>
        {selected.mode === "automatic" && <label>AUTOMATIC CATEGORY<select value={selected.rules.category ?? ""} onChange={event => setSelected(current => ({ ...current, rules: { category: event.target.value } }))}><option value="">Choose category</option>{[...new Set(products.map(product => product.category))].map(category => <option key={category}>{category}</option>)}</select></label>}
      </div><h3>ORDERED PRODUCTS</h3><p>Drag to reorder. Only active products appear on the public page.</p><div className="admin-collection-selected">{chosen.map((product, index) => <div key={product.id} draggable onDragStart={() => setDragged(product.id)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!dragged || dragged === product.id) return; setSelected(current => { const ids = current.product_ids.filter(id => id !== dragged); ids.splice(index, 0, dragged); return { ...current, product_ids: ids }; }); setDragged(null); }}><span>↕ {index + 1}. {product.name} · {product.color}</span><button type="button" onClick={() => setSelected(current => ({ ...current, product_ids: current.product_ids.filter(id => id !== product.id) }))}>REMOVE</button></div>)}</div>
      <label className="admin-collection-search">ADD PRODUCT<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, colour or slug" /></label><div className="admin-collection-options">{matching.filter(product => !selected.product_ids.includes(product.id)).map(product => <button type="button" key={product.id} onClick={() => setSelected(current => ({ ...current, product_ids: [...current.product_ids, product.id] }))}>+ {product.name} · {product.color}</button>)}</div>
      <div className="admin-save"><button className="button button-orange" disabled={busy}>{busy ? "SAVING…" : "SAVE COLLECTION"}</button>{selected.id && <><Link href={`/collections/${selected.slug}`} target="_blank">VIEW PAGE ↗</Link><button type="button" className="admin-secondary" disabled={busy} onClick={() => void remove()}>DELETE</button></>}</div></form></div>
  </main>;
}
