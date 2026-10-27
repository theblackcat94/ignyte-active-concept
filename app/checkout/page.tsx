"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { money } from "@/lib/catalog";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import { useStore } from "@/components/store-provider";
import { track } from "@/lib/analytics-client";
import "./checkout.css";

type Shipping = { name: string; phone: string; line1: string; line2: string; city: string; state: string; postal_code: string; country: "AU" };
const emptyShipping: Shipping = { name: "", phone: "", line1: "", line2: "", city: "", state: "", postal_code: "", country: "AU" };
const states = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

export default function CheckoutPage() {
  const { bag, products, clearBag } = useStore();
  const [shipping, setShipping] = useState<Shipping>(emptyShipping);
  const [email, setEmail] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [guestOrder, setGuestOrder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discountCents: number; subtotalCents: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [shippingQuote, setShippingQuote] = useState<{ state: string; subtotalCents: number; amount: number | null } | null>(null);
  const request = useRef<{ id: string; fingerprint: string } | null>(null);

  useEffect(() => {
    if (!commerceConfigured) return;
    track("checkout_started", "/checkout/");
    void browserDb().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setSignedIn(Boolean(data.user?.email));
    });
  }, []);

  const lines = bag.map(item => {
    const product = products.find(p => p.slug === item.slug);
    const variant = product?.variants?.find(v => v.size === item.size);
    return { ...item, product, variant };
  });
  const valid = lines.length > 0 && lines.every(item => item.variant?.id && item.variant.stock >= item.quantity && item.quantity <= 20);
  const subtotal = lines.reduce((sum, item) => sum + (item.variant?.price ?? item.product?.price ?? 0) * item.quantity, 0);

  const subtotalCents = Math.round(subtotal * 100);
  const appliedCoupon = coupon?.subtotalCents === subtotalCents ? coupon : null;
  const quotedShipping = shippingQuote?.state === shipping.state && shippingQuote.subtotalCents === subtotalCents ? shippingQuote.amount : null;

  useEffect(() => {
    if (!shipping.state || !commerceConfigured) return;
    let cancelled = false;
    void fetch("/api/shipping/quote", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: shipping.state, subtotalCents }) })
      .then(response => response.json()).then(result => { if (!cancelled) setShippingQuote({ state: shipping.state, subtotalCents, amount: result.configured ? result.shippingCents : null }); })
      .catch(() => { if (!cancelled) setShippingQuote({ state: shipping.state, subtotalCents, amount: null }); });
    return () => { cancelled = true; };
  }, [shipping.state, subtotalCents]);

  async function applyCoupon() {
    setCoupon(null); setCouponMessage("");
    const response = await fetch("/api/coupons/quote", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode, subtotalCents }) });
    const result = await response.json();
    if (!response.ok) { setCouponMessage(result.error || "Code unavailable"); return; }
    setCoupon({ code: result.code, discountCents: result.discountCents, subtotalCents });
    setCouponMessage("Estimated discount applied. Final amount is checked when the order is placed.");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !valid) return;
    setBusy(true);
    setError("");
    try {
      const { data: { session } } = await browserDb().auth.getSession();
      const items = lines.map(item => ({ variantId: item.variant!.id, quantity: item.quantity }));
      const fingerprint = JSON.stringify({ items, shipping, email, couponCode: appliedCoupon?.code });
      if (request.current?.fingerprint !== fingerprint) request.current = { id: crypto.randomUUID(), fingerprint };
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
      const response = await fetch("/api/checkout/manual", {
        method: "POST",
        headers,
        body: JSON.stringify({ requestId: request.current.id, shipping, items, email, couponCode: appliedCoupon?.code }),
      });
      const result = await response.json();
      if (!response.ok || !result.orderId) throw new Error(result.error || "Your order could not be placed.");
      setOrderId(result.orderId);
      setGuestOrder(Boolean(result.guest));
      clearBag();
    } catch (cause) {
      request.current = null;
      setError(cause instanceof Error ? cause.message : "Your order could not be placed.");
    } finally { setBusy(false); }
  }

  if (orderId) return <div className="checkout-page section-wrap checkout-confirmation">
    <span className="eyebrow">ORDER RECEIVED</span><h1>THANK YOU<span>.</span></h1>
    <p>Your order request <strong>{orderId}</strong> has been saved. No payment has been taken.</p>
    <p>Shipping charges and payment details will be confirmed before your order is fulfilled.{guestOrder ? " Stock will be confirmed when our team reviews your request." : ""}</p>
    <Link className="button button-dark" href={guestOrder ? `/guest/orders/${orderId}` : `/account/orders/${orderId}`}>VIEW ORDER DETAILS ↗</Link>
  </div>;

  return <div className="checkout-page section-wrap">
    <div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>CHECKOUT</span></div>
    <span className="eyebrow">IGNYTE / YOUR ORDER</span><h1>CHECKOUT<span>.</span></h1>
    {!commerceConfigured ? <div className="checkout-panel"><h2>Store setup in progress</h2><p>Order requests will open when the store database is connected.</p><Link className="text-link" href="/shop">CONTINUE SHOPPING ↗</Link></div>
      : !bag.length ? <div className="checkout-panel"><h2>Your bag is empty</h2><Link className="text-link" href="/shop">SHOP THE COLLECTION ↗</Link></div>
      : <div className="checkout-grid"><form id="order-request" className="checkout-form" onSubmit={submit}>
        <h2>Australian delivery</h2><p>Check out as a guest or use your account. No payment is collected today.</p>
        <div className="checkout-fields">
          <label className="wide">EMAIL ADDRESS<input required type="email" autoComplete="email" maxLength={254} value={email} readOnly={signedIn} onChange={event => setEmail(event.target.value)} /></label>
          <label>FULL NAME<input required autoComplete="name" maxLength={120} value={shipping.name} onChange={event => setShipping({ ...shipping, name: event.target.value })} /></label>
          <label>PHONE<input required type="tel" autoComplete="tel" minLength={8} maxLength={30} value={shipping.phone} onChange={event => setShipping({ ...shipping, phone: event.target.value })} /></label>
          <label className="wide">ADDRESS LINE 1<input required autoComplete="address-line1" maxLength={150} value={shipping.line1} onChange={event => setShipping({ ...shipping, line1: event.target.value })} /></label>
          <label className="wide">ADDRESS LINE 2<input autoComplete="address-line2" maxLength={150} value={shipping.line2} onChange={event => setShipping({ ...shipping, line2: event.target.value })} /></label>
          <label>SUBURB / CITY<input required autoComplete="address-level2" maxLength={100} value={shipping.city} onChange={event => setShipping({ ...shipping, city: event.target.value })} /></label>
          <label>STATE<select required autoComplete="address-level1" value={shipping.state} onChange={event => setShipping({ ...shipping, state: event.target.value })}><option value="">Select state</option>{states.map(state => <option key={state}>{state}</option>)}</select></label>
          <label>POSTCODE<input required inputMode="numeric" pattern="[0-9]{4}" autoComplete="postal-code" value={shipping.postal_code} onChange={event => setShipping({ ...shipping, postal_code: event.target.value })} /></label>
          <label>COUNTRY<input readOnly value="Australia" /></label>
        </div>
        <p className="checkout-email">{signedIn ? "Your order will also appear in your account." : "Guest orders can be viewed in this browser after submission. Please save the order number."}</p>
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
        <div className="checkout-coupon"><label htmlFor="coupon-code">DISCOUNT CODE</label><div><input id="coupon-code" value={couponCode} maxLength={30} onChange={event => { setCouponCode(event.target.value.toUpperCase()); setCoupon(null); setCouponMessage(""); }} placeholder="Enter code" /><button type="button" onClick={() => void applyCoupon()}>APPLY</button></div>{couponMessage && <small role="status">{couponMessage}</small>}</div>
        {appliedCoupon && <div className="checkout-total"><span>DISCOUNT ({appliedCoupon.code})</span><strong>−{money(appliedCoupon.discountCents / 100)}</strong></div>}
        <div className="checkout-total"><span>SHIPPING</span><strong>{quotedShipping === null ? "To be quoted" : money(quotedShipping / 100)}</strong></div>
        <p>Prices and order requests are in AUD and include GST. Shipping rates are estimates until confirmed by the team. No payment is taken when you submit this request.</p>
      </aside></div>}
  </div>;
}
