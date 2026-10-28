"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured, type StoreCategory, type StoreProduct, type StoreVariant } from "@/lib/commerce";
import AdminToolsNav from "@/components/admin-tools-nav";
import { emptyPdp, pdpFor, type PdpContent } from "@/data/pdp-planner";
import "./admin.css";
import "./operations.css";

type EditableVariant = Omit<StoreVariant, "id"> & { id?: string };
type EditableProduct = Omit<StoreProduct, "id" | "product_variants" | "pdp_content"> & {
  id?: string;
  pdp_content: PdpContent;
  variants: EditableVariant[];
};

const blank: EditableProduct = {
  slug: "", name: "", category: "tops", color: "", description: "", status: "draft",
  label: null, image_path: "", gallery: [], pdp_content: { ...emptyPdp }, variants: [],
};

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
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
    const categoryResponse = await fetch("/api/admin/categories", { headers: { Authorization: `Bearer ${accessToken}` } });
    if (categoryResponse.ok) setCategories(await categoryResponse.json() as StoreCategory[]);
    setMessage("");
    return refreshed;
  }

  function edit(product: StoreProduct) {
    setSelected({ ...product, pdp_content: pdpFor(product.name, product.pdp_content, product.slug), variants: product.product_variants.map(variant => ({ ...variant })) });
    setMessage("");
  }

  function change<K extends keyof EditableProduct>(field: K, value: EditableProduct[K]) {
    setSelected(current => current ? { ...current, [field]: value } : current);
  }

  function changeVariant(index: number, field: keyof EditableVariant, value: string | number | boolean | null) {
    setSelected(current => current ? { ...current, variants: current.variants.map((variant, i) =>
      i === index ? { ...variant, [field]: value } : variant) } : current);
  }

  function changePdp<K extends keyof PdpContent>(field: K, value: PdpContent[K]) {
    setSelected(current => current ? { ...current, pdp_content: { ...current.pdp_content, [field]: value } } : current);
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
      body: JSON.stringify({ ...product, variants: variants.map(({ id: variantId, sku, size, price_cents, sale_price_cents, stock_on_hand, stock_revision, active }) =>
        ({ id: variantId, sku, size, price_cents, sale_price_cents, stock_on_hand, stock_revision, active })) }),
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
  return <div className="admin-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>ADMIN</span></div><div className="admin-title"><div><span className="eyebrow">IGNYTE / INTERNAL</span><h1>PRODUCT MANAGER<span>.</span></h1><div className="admin-title-links"><Link className="text-link" href="/admin/orders">VIEW ORDERS ↗</Link><Link className="text-link" href="/admin/categories">MANAGE CATEGORIES ↗</Link></div></div><button className="button button-dark" onClick={() => setSelected({ ...blank, category: categories.find(category => category.active)?.slug ?? "tops" })}>NEW PRODUCT +</button></div>
    <AdminToolsNav />
    {message && <p role="status" className="admin-message">{message}</p>}
    <div className="admin-layout"><div className="admin-list">{products.map(product => <button key={product.id} className={selected?.id === product.id ? "active" : ""} onClick={() => edit(product)}><img src={product.image_path} alt="" /><span><strong>{product.name}</strong><small>{product.color} · {product.status.toUpperCase()}</small></span></button>)}</div>
      {selected ? <div className="admin-editor"><h2>{selected.id ? "EDIT PRODUCT" : "NEW PRODUCT"}</h2><div className="admin-fields">
        <label>NAME<input value={selected.name} onChange={event => change("name", event.target.value)} /></label>
        <label>SLUG<input value={selected.slug} onChange={event => change("slug", event.target.value)} /></label>
        <label>CATEGORY<select value={selected.category} onChange={event => change("category", event.target.value)}>{categories.filter(category => category.active || category.slug === selected.category).map(category => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></label>
        <label>COLOUR<input value={selected.color} onChange={event => change("color", event.target.value)} /></label>
        <label>STATUS<select value={selected.status} onChange={event => change("status", event.target.value as EditableProduct["status"])}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
        <label>LABEL<input value={selected.label ?? ""} onChange={event => change("label", event.target.value || null)} /></label>
        <label className="wide">DESCRIPTION<textarea rows={5} value={selected.description} onChange={event => change("description", event.target.value)} /></label>
        <label className="wide">MAIN IMAGE URL OR LOCAL PATH<input value={selected.image_path} onChange={event => change("image_path", event.target.value)} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label>
      </div><h3>PRODUCT PAGE CONTENT</h3><p className="admin-message">Planner copy is marked “To confirm”. Review each field before approval. Model details are prefilled from the updated planner and can be edited or hidden per product. Add an OEKO-TEX certificate number only after verifying it.</p><div className="admin-fields">
        <label className="wide">FEATURES — ONE BULLET PER LINE<textarea rows={7} value={selected.pdp_content.features.join("\n")} onChange={event => changePdp("features", event.target.value.split("\n").map(item => item.trim()).filter(Boolean))} /></label>
        <label className="wide">DESIGNED FOR — ONE ACTIVITY PER LINE<textarea rows={4} value={selected.pdp_content.activities.join("\n")} onChange={event => changePdp("activities", event.target.value.split("\n").map(item => item.trim()).filter(Boolean))} /></label>
        <label>FIT<input value={selected.pdp_content.fit} onChange={event => changePdp("fit", event.target.value)} /></label>
        <label>FABRIC<input value={selected.pdp_content.fabric} onChange={event => changePdp("fabric", event.target.value)} /></label>
        <label className="wide">MODEL DETAILS — OPTIONAL<textarea rows={4} placeholder="Model name, measurements and size worn" value={selected.pdp_content.model_details} onChange={event => changePdp("model_details", event.target.value)} /></label>
        <label>SHOW MODEL DETAILS<input type="checkbox" checked={selected.pdp_content.show_model_details} onChange={event => changePdp("show_model_details", event.target.checked)} /></label>
        <label>SHOW BRAND STORY<input type="checkbox" checked={selected.pdp_content.show_brand_story} onChange={event => changePdp("show_brand_story", event.target.checked)} /></label>
        <label>FEATURE IN HOME BEST SELLERS<input type="checkbox" checked={selected.pdp_content.featured_best_seller} onChange={event => changePdp("featured_best_seller", event.target.checked)} /></label>
        <label>OEKO-TEX CERTIFICATE NUMBER — OPTIONAL<input value={selected.pdp_content.oeko_certificate} onChange={event => changePdp("oeko_certificate", event.target.value)} /></label>
        <label>SHOW OEKO-TEX FABRIC CLAIM<input type="checkbox" checked={selected.pdp_content.oeko_certified} onChange={event => changePdp("oeko_certified", event.target.checked)} /></label>
        <label className="wide">PRODUCT VIDEO URL OR LOCAL PATH<input value={selected.pdp_content.video_url} onChange={event => changePdp("video_url", event.target.value)} /></label>
        <label className="wide">VIDEO POSTER URL OR LOCAL PATH<input value={selected.pdp_content.video_poster} onChange={event => changePdp("video_poster", event.target.value)} /></label>
      </div><h3>GALLERY</h3>{selected.gallery.map((item, index) => <div className="admin-gallery" key={index}><input aria-label="Image URL" value={item.image} onChange={event => change("gallery", selected.gallery.map((entry, i) => i === index ? { ...entry, image: event.target.value } : entry))} /><input aria-label="Image description" value={item.alt} onChange={event => change("gallery", selected.gallery.map((entry, i) => i === index ? { ...entry, alt: event.target.value } : entry))} /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file, index); }} /><button onClick={() => change("gallery", selected.gallery.filter((_, i) => i !== index))}>REMOVE</button></div>)}<button className="admin-secondary" onClick={() => change("gallery", [...selected.gallery, { image: "", alt: "" }])}>+ ADD GALLERY IMAGE</button>
      <div className="admin-variant-title"><h3>SIZE VARIANTS</h3><button className="admin-secondary" type="button" onClick={() => change("variants", selected.variants.map(variant => ({ ...variant, stock_on_hand: 20, active: true })))}>SET EACH SIZE TO 20 &amp; AVAILABLE</button></div><div className="admin-variants"><div className="variant-head"><span>SKU</span><span>SIZE</span><span>REGULAR AUD</span><span>STOCK</span><span>AVAILABLE</span><span>ON SALE</span><span>SALE AUD</span></div>{selected.variants.map((variant, index) => <div className="variant-row" key={variant.id ?? index}><input aria-label="SKU" value={variant.sku} onChange={event => changeVariant(index, "sku", event.target.value)} /><input aria-label="Size" value={variant.size} onChange={event => changeVariant(index, "size", event.target.value)} /><input aria-label="Regular price in AUD" type="number" min="0" step="0.01" value={(variant.price_cents / 100).toFixed(2)} onChange={event => changeVariant(index, "price_cents", Math.round(Number(event.target.value) * 100))} /><input aria-label="Stock on hand" type="number" min="0" value={variant.stock_on_hand} onChange={event => changeVariant(index, "stock_on_hand", Number(event.target.value))} /><input aria-label="Available for sale" type="checkbox" checked={variant.active} onChange={event => changeVariant(index, "active", event.target.checked)} /><input aria-label="On sale" type="checkbox" checked={variant.sale_price_cents !== null} onChange={event => changeVariant(index, "sale_price_cents", event.target.checked ? 0 : null)} /><input aria-label="Sale price in AUD" type="number" min="0.01" step="0.01" required={variant.sale_price_cents !== null} disabled={variant.sale_price_cents === null} value={variant.sale_price_cents === null ? "" : variant.sale_price_cents ? (variant.sale_price_cents / 100).toFixed(2) : ""} onChange={event => changeVariant(index, "sale_price_cents", Math.round(Number(event.target.value) * 100))} /></div>)}</div><button className="admin-secondary" onClick={() => change("variants", [...selected.variants, { product_id: selected.id ?? "", sku: "", size: "", price_cents: 0, sale_price_cents: null, stock_on_hand: 0, stock_revision: 0, active: false }])}>+ ADD SIZE</button>
      <div className="admin-save"><button className="button button-orange" disabled={busy} onClick={save}>{busy ? "SAVING…" : "SAVE PRODUCT"}</button><span>Publishing requires a valid price, size and stock for each active variant.</span></div></div> : <div className="admin-empty">Select a product to edit it, or create a new one.</div>}</div>
  </div>;
}
