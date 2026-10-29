"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import AdminToolsNav from "@/components/admin-tools-nav";
import "../admin.css";
import "../operations.css";

type Order = { id: string; status: string; customer_email: string | null; total_cents: number | null;
  subtotal_cents: number; discount_cents: number; shipping_cents: number; created_at: string;
  shipping_details: { test_order?: boolean; name?: string; phone?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } } | null;
  order_items: { sku: string; product_name: string; size: string; quantity: number; unit_price_cents: number }[] };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!commerceConfigured) return;
    void (async () => {
      const { data: { session } } = await browserDb().auth.getSession();
      if (!session) { setMessage("Sign in with a team account to view orders."); return; }
      const { data: staff } = await browserDb().from("staff_members").select("role").eq("user_id", session.user.id).maybeSingle();
      setIsAdmin(staff?.role === "admin");
      const response = await fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) { setMessage("This account cannot view orders."); return; }
      setOrders(await response.json());
    })();
  }, []);
  async function cancelOrder(id: string) {
    if (!window.confirm("Cancel this unpaid order request and return its stock?")) return;
    setMessage("");
    const { data: { session } } = await browserDb().auth.getSession();
    if (!session) { setMessage("Sign in again to manage orders."); return; }
    const response = await fetch(`/api/admin/orders/${id}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not cancel the order."); return; }
    setOrders(current => current.map(order => order.id === id ? { ...order, status: "cancelled" } : order));
    setMessage("Order cancelled and stock returned.");
  }
  async function retryEmails() {
    const { data: { session } } = await browserDb().auth.getSession();
    if (!session) { setMessage("Sign in again to retry order emails."); return; }
    const response = await fetch("/api/admin/emails/retry", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error || "Could not retry pending emails."); return; }
    setMessage(result.configured ? `Email retry checked ${result.attempted} pending message(s).` : "SES is not configured; pending order emails remain queued.");
  }
  return <div className="admin-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/admin">ADMIN</Link><span>/</span><span>ORDERS</span></div><div className="admin-title"><div><span className="eyebrow">IGNYTE / INTERNAL</span><h1>ORDERS<span>.</span></h1></div><div className="admin-order-actions">{isAdmin && <button className="button button-dark" onClick={() => void retryEmails()}>RETRY ORDER EMAILS</button>}<Link href="/admin" className="button button-dark">PRODUCT MANAGER ↗</Link></div></div><AdminToolsNav />{message && <p role="status">{message}</p>}
    <div className="admin-orders">{orders.map(order => <article key={order.id}><div className="admin-order-head"><strong><Link href={`/admin/orders/${order.id}`}>{order.id}</Link></strong><span>{order.status === "awaiting_payment" ? "AWAITING PAYMENT" : order.status.toUpperCase()} · {new Date(order.created_at).toLocaleString("en-AU")}</span></div><p>{order.shipping_details?.test_order && <strong className="order-test-label">TEST ORDER · </strong>}{order.customer_email ?? "Email pending"} · ${((order.total_cents ?? order.subtotal_cents - (order.discount_cents ?? 0)) / 100).toFixed(2)} AUD{order.status === "awaiting_payment" ? " plus shipping to be quoted" : ""}</p><ul>{order.order_items.map((item, index) => <li key={index}>{item.product_name} / {item.size} · {item.sku} × {item.quantity}</li>)}</ul>{order.shipping_details?.address && <address>{order.shipping_details.name}<br />{order.shipping_details.phone && <>{order.shipping_details.phone}<br /></>}{order.shipping_details.address.line1}<br />{order.shipping_details.address.line2 && <>{order.shipping_details.address.line2}<br /></>}{order.shipping_details.address.city} {order.shipping_details.address.state} {order.shipping_details.address.postal_code}<br />{order.shipping_details.address.country}</address>}<div className="admin-order-actions"><Link className="admin-secondary" href={`/admin/orders/${order.id}`}>VIEW ORDER ↗</Link>{isAdmin && order.status === "awaiting_payment" && <button className="admin-secondary" onClick={() => void cancelOrder(order.id)}>CANCEL ORDER &amp; RETURN STOCK</button>}</div></article>)}</div>
  </div>;
}
