"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import { money } from "@/lib/catalog";
import { orderSelect, type OrderDetail } from "@/lib/order";
import "@/app/order-detail.css";

export default function OrderDetailView({ id, scope }: { id: string; scope: "admin" | "account" | "guest" }) {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const back = scope === "admin" ? "/admin/orders" : scope === "guest" ? "/shop" : "/account";

  const load = useCallback(async () => {
    if (!commerceConfigured) { setMessage("Store accounts are not configured."); setLoading(false); return; }
    if (scope === "guest") {
      const response = await fetch(`/api/guest-orders/${id}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) setMessage(result.error || "Could not load this guest order.");
      else setOrder(result as OrderDetail);
      setLoading(false);
      return;
    }
    const db = browserDb();
    const { data: { session } } = await db.auth.getSession();
    if (!session) { setMessage("Sign in to view this order."); setLoading(false); return; }
    if (scope === "admin") {
      const { data: staff } = await db.from("staff_members").select("role").eq("user_id", session.user.id).maybeSingle();
      setIsAdmin(staff?.role === "admin");
      const response = await fetch(`/api/admin/orders/${id}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      const result = await response.json();
      if (!response.ok) setMessage(result.error || "Could not load order.");
      else setOrder(result as OrderDetail);
    } else {
      const { data, error } = await db.from("orders").select(orderSelect).eq("id", id).maybeSingle();
      if (error || !data) setMessage("Order not found in your account.");
      else setOrder(data as OrderDetail);
    }
    setLoading(false);
  }, [id, scope]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void load(); });
    return () => { cancelled = true; };
  }, [load]);

  async function cancelOrder() {
    if (!order || !window.confirm(order.stock_reserved
      ? "Cancel this unpaid order request and return its stock?"
      : "Cancel this guest order request? No stock was reserved.")) return;
    const { data: { session } } = await browserDb().auth.getSession();
    if (!session) { setMessage("Sign in again to manage orders."); return; }
    const response = await fetch(`/api/admin/orders/${id}/cancel`, {
      method: "POST", headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not cancel order."); return; }
    setMessage(order.stock_reserved ? "Order cancelled. Reserved stock has been returned." : "Guest request cancelled.");
    await load();
  }

  const label = order?.status === "awaiting_payment" ? "AWAITING PAYMENT" : order?.status.toUpperCase();
  const address = order?.shipping_details?.address;

  return <div className="order-detail-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href={back}>{scope === "admin" ? "ORDERS" : scope === "guest" ? "SHOP" : "ACCOUNT"}</Link><span>/</span><span>ORDER DETAIL</span></div>
    <div className="order-detail-heading"><div><span className="eyebrow">IGNYTE / {scope === "admin" ? "TEAM ORDERS" : "YOUR ORDER"}</span><h1>ORDER DETAIL<span>.</span></h1><p className="order-number">{id}</p></div><Link href={back} className="text-link">← {scope === "guest" ? "BACK TO SHOP" : "BACK TO ORDERS"}</Link></div>
    {loading && <p role="status">Loading order…</p>}
    {message && <p role="status" className="order-message">{message} {!order && <Link href={back}>GO BACK ↗</Link>}</p>}
    {order && <div className="order-detail-grid"><div className="order-detail-main"><section className="order-detail-card"><div className="order-detail-card-head"><div><span className="eyebrow">ORDER STATUS</span><h2>{label}</h2></div>{order.shipping_details?.test_order && <strong className="order-test-badge">TEST ORDER</strong>}</div><p>Placed {new Date(order.created_at).toLocaleString("en-AU", { dateStyle: "long", timeStyle: "short" })}</p>{order.status === "awaiting_payment" && <p>Payment has not been collected. Shipping will be quoted before fulfillment.{!order.stock_reserved ? " Stock will be confirmed when the team reviews this guest request." : ""}</p>}{order.paid_at && <p>Paid {new Date(order.paid_at).toLocaleString("en-AU", { dateStyle: "long", timeStyle: "short" })}</p>}</section>
      <section className="order-detail-card"><span className="eyebrow">YOUR EDIT</span><h2>ITEMS</h2><div className="order-detail-items">{order.order_items.map((item, index) => <div className="order-detail-item" key={`${item.sku}-${index}`}><div><strong>{item.product_name}</strong><span>{item.size} · {item.sku}</span><span>Qty {item.quantity} × {money(item.unit_price_cents / 100)}</span></div><strong>{money(item.unit_price_cents * item.quantity / 100)}</strong></div>)}</div></section></div>
      <aside className="order-detail-side"><section className="order-detail-card"><span className="eyebrow">PAYMENT SUMMARY</span><h2>TOTALS</h2><div className="order-total-row"><span>Items</span><strong>{money(order.subtotal_cents / 100)}</strong></div>{order.discount_cents > 0 && <div className="order-total-row"><span>Discount {order.coupon_code && `(${order.coupon_code})`}</span><strong>−{money(order.discount_cents / 100)}</strong></div>}<div className="order-total-row"><span>Shipping</span><strong>{order.status === "awaiting_payment" ? "To be quoted" : money(order.shipping_cents / 100)}</strong></div><div className="order-total-row grand"><span>{order.status === "awaiting_payment" ? "After discount, before shipping" : "Total"}</span><strong>{money((order.total_cents ?? order.subtotal_cents - (order.discount_cents ?? 0)) / 100)}</strong></div><p>Prices include GST. No card payment has been taken for an awaiting payment order.</p></section>
      <section className="order-detail-card"><span className="eyebrow">DELIVERY</span><h2>SHIP TO</h2><address>{order.shipping_details?.name && <><strong>{order.shipping_details.name}</strong><br /></>}{address?.line1}{address?.line1 && <br />}{address?.line2 && <>{address.line2}<br /></>}{address?.city} {address?.state} {address?.postal_code}<br />{address?.country}{order.shipping_details?.phone && <><br />{order.shipping_details.phone}</>}</address>{order.customer_email && <p className="order-contact">{order.customer_email}</p>}</section>
      {scope === "admin" && isAdmin && order.status === "awaiting_payment" && <button className="order-cancel" onClick={() => void cancelOrder()}>{order.stock_reserved ? "CANCEL ORDER & RETURN STOCK" : "CANCEL GUEST REQUEST"}</button>}</aside></div>}
  </div>;
}
