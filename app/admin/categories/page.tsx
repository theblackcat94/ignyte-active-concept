"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured, type StoreCategory } from "@/lib/commerce";
import AdminToolsNav from "@/components/admin-tools-nav";
import "../admin.css";
import "../operations.css";

const blank: StoreCategory = { slug: "", name: "", cover_path: "/images/collection-covers/", sort_order: 50, active: true };

export default function CategoriesPage() {
  const [token, setToken] = useState<string | null>(null);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selected, setSelected] = useState<StoreCategory>({ ...blank });
  const [existing, setExisting] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

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
      body: JSON.stringify(selected),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(result.error || "Could not save category."); return; }
    setSelected(result as StoreCategory); setExisting(true);
    setMessage("Category saved.");
    await load(token);
  }

  if (!commerceConfigured || !token) return <div className="admin-page section-wrap"><h1>CATEGORIES.</h1><p>Sign in with a team account.</p><Link href="/account" className="button button-dark">GO TO ACCOUNT</Link></div>;

  return <div className="admin-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/admin">ADMIN</Link><span>/</span><span>CATEGORIES</span></div>
    <div className="admin-title"><div><span className="eyebrow">IGNYTE / INTERNAL</span><h1>CATEGORIES<span>.</span></h1><p>Manage collection names, covers and navigation order.</p></div><button className="button button-dark" onClick={() => { setSelected({ ...blank }); setExisting(false); setMessage(""); }}>NEW CATEGORY +</button></div>
    <AdminToolsNav />
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="admin-layout"><div className="admin-list">{categories.map(category => <button key={category.slug} className={existing && selected.slug === category.slug ? "active" : ""} onClick={() => { setSelected({ ...category }); setExisting(true); setMessage(""); }}><img src={category.cover_path} alt="" /><span><strong>{category.name}</strong><small>/{category.slug} · {category.active ? "VISIBLE" : "HIDDEN"}</small></span></button>)}</div>
      <form className="admin-editor" onSubmit={save}><h2>{existing ? "EDIT CATEGORY" : "NEW CATEGORY"}</h2><div className="admin-fields">
        <label>NAME<input required maxLength={80} value={selected.name} onChange={event => setSelected(current => ({ ...current, name: event.target.value }))} /></label>
        <label>SLUG<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={existing} value={selected.slug} onChange={event => setSelected(current => ({ ...current, slug: event.target.value }))} /></label>
        <label className="wide">COVER IMAGE PATH OR HTTPS URL<input required value={selected.cover_path} onChange={event => setSelected(current => ({ ...current, cover_path: event.target.value }))} /></label>
        <label>DISPLAY ORDER<input type="number" min={0} max={10000} value={selected.sort_order} onChange={event => setSelected(current => ({ ...current, sort_order: Number(event.target.value) }))} /></label>
        <label className="admin-check">VISIBLE IN SHOP<input type="checkbox" checked={selected.active} onChange={event => setSelected(current => ({ ...current, active: event.target.checked }))} /></label>
      </div><div className="admin-save"><button className="button button-orange" disabled={busy}>{busy ? "SAVING…" : "SAVE CATEGORY"}</button><span>Categories with active products must remain visible.</span></div></form></div>
  </div>;
}
