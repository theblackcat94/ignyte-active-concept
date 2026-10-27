"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured, type StoreProduct, type StoreVariant } from "@/lib/commerce";
import "./admin.css";

type EditableVariant = Omit<StoreVariant, "id"> & { id?: string };
type EditableProduct = Omit<StoreProduct, "id" | "product_variants"> & {
  id?: string;
  variants: EditableVariant[];
};

const blank: EditableProduct = {
  slug: "", name: "", category: "tops", color: "", description: "", status: "draft",
  label: null, image_path: "", gallery: [], variants: [],
};

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [selected, setSelected] = useState<EditableProduct | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!commerceConfigured) return;
    const db = browserDb();
    const refresh = async () => {
      const { data: { session } } = await db.auth.getSession();
      setToken(session?.access_token ?? null);
    };
    void refresh();
    const { data } = db.auth.onAuthStateChange(() => { setTimeout(() => { void refresh(); }, 0); });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => { if (token) void load(token); }, [token]);

  async function load(accessToken: string) {
    const response = await fetch("/api/admin/products", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) { setMessage(response.status === 403 ? "This account does not have team access." : "Could not load products."); return null; }
    const refreshed = await response.json() as StoreProduct[];
    setProducts(refreshed);
    setMessage("");
    return refreshed;
  }

  function edit(product: StoreProduct) {
    setSelected({ ...product, variants: product.product_variants.map(variant => ({ ...variant })) });
    setMessage("");
  }

  function change<K extends keyof EditableProduct>(field: K, value: EditableProduct[K]) {
    setSelected(current => current ? { ...current, [field]: value } : current);
  }

  function changeVariant(index: number, field: keyof EditableVariant, value: string | number | boolean) {
    setSelected(current => current ? { ...current, variants: current.variants.map((variant, i) =>
      i === index ? { ...variant, [field]: value } : variant) } : current);
  }

  async function upload(file: File, galleryIndex?: number) {
    if (!token) return;
    setBusy(true);
    const form = new FormData(); form.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(result.error || "Upload failed."); return; }
    if (galleryIndex === undefined) change("image_path", result.url);
    else setSelected(current => current ? { ...current, gallery: current.gallery.map((item, i) => i === galleryIndex ? { ...item, image: result.url } : item) } : current);
  }

  async function save() {
    if (!token || !selected) return;
    setBusy(true); setMessage("");
    const { id, variants, ...product } = selected;
    const response = await fetch(id ? `/api/admin/products/${id}` : "/api/admin/products", {
      method: id ? "PUT" : "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, variants: variants.map(({ id: variantId, sku, size, price_cents, stock_on_hand, stock_revision, active }) =>
        ({ id: variantId, sku, size, price_cents, stock_on_hand, stock_revision, active })) }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) { setMessage(typeof result.error === "string" ? result.error : "Check the required fields and variant values."); return; }
    const refreshed = await load(token);
    if (!id) setSelected(null);
    else {
      const updated = refreshed?.find(item => item.id === id);
      if (updated) edit(updated);
    }
    setMessage("Product saved.");
  }

  if (!commerceConfigured) return <div className="admin-page section-wrap"><h1>PRODUCT MANAGER</h1><p>Connect the new store database to use the team editor.</p></div>;
  if (!token) return <div className="admin-page section-wrap"><h1>PRODUCT MANAGER</h1><p>Sign in with a team account to manage products.</p><Link className="button button-dark" href="/account">GO TO ACCOUNT</Link></div>;
  return <div className="admin-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>ADMIN</span></div><div className="admin-title"><div><span className="eyebrow">IGNYTE / INTERNAL</span><h1>PRODUCT MANAGER<span>.</span></h1><Link className="text-link" href="/admin/orders">VIEW ORDERS ↗</Link></div><button className="button button-dark" onClick={() => setSelected({ ...blank })}>NEW PRODUCT +</button></div>
    {message && <p role="status" className="admin-message">{message}</p>}
    <div className="admin-layout"><div className="admin-list">{products.map(product => <button key={product.id} className={selected?.id === product.id ? "active" : ""} onClick={() => edit(product)}><img src={product.image_path} alt="" /><span><strong>{product.name}</strong><small>{product.color} · {product.status.toUpperCase()}</small></span></button>)}</div>
      {selected ? <div className="admin-editor"><h2>{selected.id ? "EDIT PRODUCT" : "NEW PRODUCT"}</h2><div className="admin-fields">
        <label>NAME<input value={selected.name} onChange={event => change("name", event.target.value)} /></label>
        <label>SLUG<input value={selected.slug} onChange={event => change("slug", event.target.value)} /></label>
        <label>CATEGORY<select value={selected.category} onChange={event => change("category", event.target.value as EditableProduct["category"])}><option value="sports-bras">Sports bras</option><option value="tops">Tops</option><option value="leggings">Leggings</option><option value="shorts">Shorts</option></select></label>
        <label>COLOUR<input value={selected.color} onChange={event => change("color", event.target.value)} /></label>
        <label>STATUS<select value={selected.status} onChange={event => change("status", event.target.value as EditableProduct["status"])}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
        <label>LABEL<input value={selected.label ?? ""} onChange={event => change("label", event.target.value || null)} /></label>
        <label className="wide">DESCRIPTION<textarea rows={5} value={selected.description} onChange={event => change("description", event.target.value)} /></label>
        <label className="wide">MAIN IMAGE URL OR LOCAL PATH<input value={selected.image_path} onChange={event => change("image_path", event.target.value)} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>
      </div><h3>GALLERY</h3>{selected.gallery.map((item, index) => <div className="admin-gallery" key={index}><input aria-label="Image URL" value={item.image} onChange={event => change("gallery", selected.gallery.map((entry, i) => i === index ? { ...entry, image: event.target.value } : entry))} /><input aria-label="Image description" value={item.alt} onChange={event => change("gallery", selected.gallery.map((entry, i) => i === index ? { ...entry, alt: event.target.value } : entry))} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, index); }} /><button onClick={() => change("gallery", selected.gallery.filter((_, i) => i !== index))}>REMOVE</button></div>)}<button className="admin-secondary" onClick={() => change("gallery", [...selected.gallery, { image: "", alt: "" }])}>+ ADD GALLERY IMAGE</button>
      <h3>SIZE VARIANTS</h3><div className="admin-variants"><div className="variant-head"><span>SKU</span><span>SIZE</span><span>PRICE AUD</span><span>STOCK</span><span>ON SALE</span></div>{selected.variants.map((variant, index) => <div className="variant-row" key={variant.id ?? index}><input aria-label="SKU" value={variant.sku} onChange={event => changeVariant(index, "sku", event.target.value)} /><input aria-label="Size" value={variant.size} onChange={event => changeVariant(index, "size", event.target.value)} /><input aria-label="Price in AUD" type="number" min="0" step="0.01" value={(variant.price_cents / 100).toFixed(2)} onChange={event => changeVariant(index, "price_cents", Math.round(Number(event.target.value) * 100))} /><input aria-label="Stock on hand" type="number" min="0" value={variant.stock_on_hand} onChange={event => changeVariant(index, "stock_on_hand", Number(event.target.value))} /><input aria-label="On sale" type="checkbox" checked={variant.active} onChange={event => changeVariant(index, "active", event.target.checked)} /></div>)}</div><button className="admin-secondary" onClick={() => change("variants", [...selected.variants, { product_id: selected.id ?? "", sku: "", size: "", price_cents: 0, stock_on_hand: 0, stock_revision: 0, active: false }])}>+ ADD SIZE</button>
      <div className="admin-save"><button className="button button-orange" disabled={busy} onClick={save}>{busy ? "SAVING…" : "SAVE PRODUCT"}</button><span>Publishing requires a valid price, size and stock for each active variant.</span></div></div> : <div className="admin-empty">Select a product to edit it, or create a new one.</div>}</div>
  </div>;
}
