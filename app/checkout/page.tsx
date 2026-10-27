"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { money } from "@/lib/catalog";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import { useStore } from "@/components/store-provider";
import "./checkout.css";

type Shipping = { name: string; phone: string; line1: string; line2: string; city: string; state: string; postal_code: string; country: "AU" };
const emptyShipping: Shipping = { name: "", phone: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "AU" };
const states = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export default function CheckoutPage() {
  const router = useRouter();
  const { bag, products, clearBag } = useStore();
  const [shipping, setShipping] = useState<Shipping>(emptyShipping);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const request = useRef<{ id: string; fingerprint: string } | null>(null);

  useEffect(() => {
    if (!commerceConfigured) return;
    void browserDb().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const lines = bag.map(item => {
    const product = products.find(p => p.slug === item.slug);
    const variant = product?.variants?.find(v => v.size === item.size);
    return { ...item, product, variant };
  });
  const valid = lines.length > 0 && lines.every(item => item.variant?.id && item.variant.stock >= item.quantity && item.quantity <= 20);
  const subtotal = lines.reduce((sum, item) => sum + (item.variant?.price ?? item.product?.price ?? 0) * item.quantity, 0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !valid) return;
    setBusy(true);
    setError("");
    try {
      const { data: { session } } = await browserDb().auth.getSession();
      if (!session) { router.push("/account?next=checkout"); return; }
      const items = lines.map(item => ({ variantId: item.variant!.id, quantity: item.quantity }));
      const fingerprint = JSON.stringify({ items, shipping });
      if (request.current?.fingerprint !== fingerprint) request.current = { id: crypto.randomUUID(), fingerprint };
      const response = await fetch("/api/checkout/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ requestId: request.current.id, shipping, items }),
      });
      const result = await response.json();
      if (!response.ok || !result.orderId) throw new Error(result.error || "Your order could not be placed.");
      setOrderId(result.orderId);
      clearBag();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your order could not be placed.");
    } finally { setBusy(false); }
  }

  if (orderId) return <div className="checkout-page section-wrap checkout-confirmation">
    <span className="eyebrow">ORDER RECEIVED</span><h1>THANK YOU<span>.</span></h1>
    <p>Your order request <strong>{orderId}</strong> has been saved. No payment has been taken.</p>
    <p>Shipping charges and payment details will be confirmed before your order is fulfilled.</p>
    <Link className="button button-dark" href={`/account/orders/${orderId}`}>VIEW ORDER DETAILS ↗</Link>
  </div>;

  return <div className="checkout-page section-wrap">
    <div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>CHECKOUT</span></div>
    <span className="eyebrow">IGNYTE / YOUR ORDER</span><h1>CHECKOUT<span>.</span></h1>
    {!commerceConfigured ? <div className="checkout-panel"><h2>Store setup in progress</h2><p>Order requests will open when the store database is connected.</p><Link className="text-link" href="/shop">CONTINUE SHOPPING ↗</Link></div>
      : !bag.length ? <div className="checkout-panel"><h2>Your bag is empty</h2><Link className="text-link" href="/shop">SHOP THE COLLECTION ↗</Link></div>
      : <div className="checkout-grid"><form id="order-request" className="checkout-form" onSubmit={submit}>
        <h2>Australian delivery</h2><p>Sign in to place an order request. No payment is collected today.</p>
        <div className="checkout-fields">
          <label>FULL NAME<input required autoComplete="name" maxLength={120} value={shipping.name} onChange={event => setShipping({ ...shipping, name: event.target.value })} /></label>
          <label>PHONE<input required type="tel" autoComplete="tel" minLength={8} maxLength={30} value={shipping.phone} onChange={event => setShipping({ ...shipping, phone: event.target.value })} /></label>
          <label className="wide">ADDRESS LINE 1<input required autoComplete="address-line1" maxLength={150} value={shipping.line1} onChange={event => setShipping({ ...shipping, line1: event.target.value })} /></label>
          <label className="wide">ADDRESS LINE 2<input autoComplete="address-line2" maxLength={150} value={shipping.line2} onChange={event => setShipping({ ...shipping, line2: event.target.value })} /></label>
          <label>SUBURB / CITY<input required autoComplete="address-level2" maxLength={100} value={shipping.city} onChange={event => setShipping({ ...shipping, city: event.target.value })} /></label>
          <label>STATE<select required autoComplete="address-level1" value={shipping.state} onChange={event => setShipping({ ...shipping, state: event.target.value })}><option value="">Select state</option>{states.map(state => <option key={state}>{state}</option>)}</select></label>
          <label>POSTCODE<input required inputMode="numeric" pattern="[0-9]{4}" autoComplete="postal-code" value={shipping.postal_code} onChange={event => setShipping({ ...shipping, postal_code: event.target.value })} /></label>
          <label>COUNTRY<input readOnly value="Australia" /></label>
        </div>
        {email && <p className="checkout-email">Order updates for <strong>{email}</strong></p>}
        {!email && <p className="checkout-email">You’ll be asked to sign in or create an account before placing the order.</p>}
        {error && <p className="checkout-error" role="alert">{error}</p>}
        <button className="button button-orange" disabled={!valid || busy}>{busy ? "PLACING ORDER…" : "PLACE ORDER REQUEST ↗"}</button>
      </form><aside className="checkout-summary"><h2>YOUR ORDER</h2>
        {lines.map(item => <div className="checkout-item" key={`${item.slug}-${item.size}`}>
          {item.product && <img src={item.product.image} alt={item.product.name} />}
          <div><strong>{item.product?.name ?? "Unavailable product"}</strong><span>{item.size} · Qty {item.quantity}</span></div>
          <strong>{money((item.variant?.price ?? item.product?.price ?? 0) * item.quantity)}</strong>
        </div>)}
        {!valid && <p className="checkout-error">An item is unavailable. Please update your bag before placing the order.</p>}
        <div className="checkout-total"><span>SUBTOTAL</span><strong>{money(subtotal)}</strong></div>
        <p>Shipping will be quoted separately. Prices are in AUD and include GST. No payment is taken when you submit this request.</p>
      </aside></div>}
  </div>;
}
