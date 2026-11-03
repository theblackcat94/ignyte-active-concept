"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured, type StoreCategory } from "@/lib/commerce";
import AdminToolsNav from "@/components/admin-tools-nav";
import "../admin.css";
import "../operations.css";
import "../collections/collections-admin.css";

const blank: StoreCategory = { slug: "", name: "", cover_path: "", cover_alt: "", focal_x: 50, focal_y: 50, sort_order: 50, active: true, archived_at: null, product_count: 0 };

export default function CategoriesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selected, setSelected] = useState<StoreCategory>({ ...blank });
  const [existing, setExisting] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reassignTo, setReassignTo] = useState("");

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
    const response = await fetch("/api/admin/categories", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) { setMessage("Category access requires a team account."); return; }
    setCategories(await response.json() as StoreCategory[]);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/categories", {
      method: existing ? "PUT" : "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...selected, cover_alt: selected.cover_alt ?? "", focal_x: selected.focal_x ?? 50, focal_y: selected.focal_y ?? 50 }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(result.error || "Could not save category."); return; }
    setSelected(result as StoreCategory); setExisting(true);
    setMessage("Category saved.");
    await load(token);
    window.dispatchEvent(new Event("ignyte:catalog-changed"));
    localStorage.setItem("ignyte:catalog-version", String(Date.now()));
  }

  async function upload(file: File) {
    if (!token) return;
    setBusy(true); setMessage("");
    const form = new FormData(); form.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(result.error || "Could not upload cover."); return; }
    setSelected(current => ({ ...current, cover_path: result.url }));
    setMessage("Cover uploaded. Save the category to publish it.");
  }

  async function lifecycle(action: "hide" | "publish" | "archive" | "restore" | "delete") {
    if (!token || !existing) return;
    const count = selected.product_count ?? 0;
    const consequence = action === "delete" ? `${count} associated product${count === 1 ? "" : "s"} ${count ? `will be moved to ${reassignTo || "a category you select"}` : "will remain unchanged"}. The old URL will redirect.` :
      `${count} associated product${count === 1 ? "" : "s"} will remain in the catalog.`;
    if (!window.confirm(`${action.toUpperCase()} ${selected.name}?\n\n${consequence}`)) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/admin/categories", { method: "DELETE", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ slug: selected.slug, action, reassign_to: reassignTo || undefined }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(result.error || "Could not update category."); return; }
    setSelected({ ...blank }); setExisting(false); setReassignTo("");
    setMessage(`${selected.name} ${action === "delete" ? "deleted" : action === "restore" || action === "publish" ? "published" : action === "archive" ? "archived" : "hidden"}.`);
    await load(token);
    window.dispatchEvent(new Event("ignyte:catalog-changed"));
    localStorage.setItem("ignyte:catalog-version", String(Date.now()));
  }

  if (!commerceConfigured || !token) return <div className="admin-page section-wrap"><h1>CATEGORIES.</h1><p>Sign in with a team account.</p><Link href="/account" className="button button-dark">GO TO ACCOUNT</Link></div>;

  return <div className="admin-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/admin">ADMIN</Link><span>/</span><span>CATEGORIES</span></div>
    <div className="admin-title"><div><span className="eyebrow">IGNYTE / INTERNAL</span><h1>CATEGORIES<span>.</span></h1><p>Product types used in Shop navigation and filtering. Curated selections are managed under Collections.</p></div><button className="button button-dark" onClick={() => { setSelected({ ...blank }); setExisting(false); setMessage(""); }}>NEW CATEGORY +</button></div>
    <AdminToolsNav />
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="admin-layout"><div className="admin-list">{categories.map(category => <button key={category.slug} className={existing && selected.slug === category.slug ? "active" : ""} onClick={() => { setSelected({ ...category }); setExisting(true); setMessage(""); setReassignTo(""); }}>{category.cover_path ? <img src={category.cover_path} alt="" /> : <span className="admin-cover-empty" aria-hidden="true">+</span>}<span><strong>{category.name}</strong><small>/{category.slug} · {category.archived_at ? "ARCHIVED" : category.active ? "VISIBLE" : "HIDDEN"} · {category.product_count ?? 0} products</small></span></button>)}</div>
      <form className="admin-editor" onSubmit={save}><h2>{existing ? "EDIT CATEGORY" : "NEW CATEGORY"}</h2><div className="admin-fields">
        <label>NAME<input required maxLength={80} value={selected.name} onChange={event => setSelected(current => ({ ...current, name: event.target.value }))} /></label>
        <label>SLUG<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={existing} value={selected.slug} onChange={event => setSelected(current => ({ ...current, slug: event.target.value }))} /></label>
        <div className="admin-cover-field wide"><strong>CATEGORY COVER IMAGE</strong>{selected.cover_path && <img src={selected.cover_path} alt={selected.cover_alt || "Category cover preview"} style={{ objectPosition: `${selected.focal_x ?? 50}% ${selected.focal_y ?? 50}%` }} />}<input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Upload category cover image" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} /><small>Recommended: 1600 × 1200 px for the large Sports Bras mosaic tile; 1200 × 1200 px for smaller category tiles. JPG, PNG or WebP. Keep the subject near the centre for responsive crops.</small>{selected.cover_path && <button type="button" className="admin-secondary" onClick={() => setSelected(current => ({ ...current, cover_path: "" }))}>REMOVE COVER</button>}</div>
        <label className="wide">COVER IMAGE PATH OR HTTPS URL<input value={selected.cover_path} onChange={event => setSelected(current => ({ ...current, cover_path: event.target.value }))} /></label>
        <label className="wide">COVER IMAGE ALT TEXT<input maxLength={200} value={selected.cover_alt ?? ""} onChange={event => setSelected(current => ({ ...current, cover_alt: event.target.value }))} /></label>
        <label>HORIZONTAL FOCAL POINT ({selected.focal_x ?? 50}%)<input type="range" min={0} max={100} value={selected.focal_x ?? 50} onChange={event => setSelected(current => ({ ...current, focal_x: Number(event.target.value) }))} /></label>
        <label>VERTICAL FOCAL POINT ({selected.focal_y ?? 50}%)<input type="range" min={0} max={100} value={selected.focal_y ?? 50} onChange={event => setSelected(current => ({ ...current, focal_y: Number(event.target.value) }))} /></label>
        <label>DISPLAY ORDER<input type="number" min={0} max={10000} value={selected.sort_order} onChange={event => setSelected(current => ({ ...current, sort_order: Number(event.target.value) }))} /></label>
        <label className="admin-check">VISIBLE IN SHOP<input type="checkbox" checked={selected.active} onChange={event => setSelected(current => ({ ...current, active: event.target.checked }))} /></label>
      </div><div className="admin-save"><button className="button button-orange" disabled={busy}>{busy ? "SAVING…" : "SAVE CATEGORY"}</button><span>Published categories appear in Shop without a redeploy.</span></div>{existing && <div className="admin-category-lifecycle"><h3>CATEGORY VISIBILITY & REMOVAL</h3><p>{selected.product_count ?? 0} products are associated with this category. Hiding or archiving leaves all product records and orders intact.</p><div><button type="button" className="admin-secondary" disabled={busy} onClick={() => void lifecycle(selected.active ? "hide" : "publish")}>{selected.active ? "UNPUBLISH / HIDE" : "PUBLISH"}</button><button type="button" className="admin-secondary" disabled={busy} onClick={() => void lifecycle(selected.archived_at ? "restore" : "archive")}>{selected.archived_at ? "RESTORE" : "ARCHIVE"}</button></div><label>REASSIGN PRODUCTS BEFORE DELETING<select value={reassignTo} onChange={event => setReassignTo(event.target.value)}><option value="">{selected.product_count ? "Choose a published category" : "No products to reassign"}</option>{categories.filter(category => category.slug !== selected.slug && category.active && !category.archived_at).map(category => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></label><button type="button" className="admin-secondary" disabled={busy || Boolean(selected.product_count && !reassignTo)} onClick={() => void lifecycle("delete")}>DELETE CATEGORY</button></div>}</form></div>
  </div>;
}
