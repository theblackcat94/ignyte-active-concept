"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import "../admin.css";

type Order = { id: string; status: string; customer_email: string | null; total_cents: number | null;
  subtotal_cents: number; shipping_cents: number; created_at: string;
  shipping_details: { name?: string; address?: { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string } } | null;
  order_items: { sku: string; product_name: string; size: string; quantity: number; unit_price_cents: number }[] };

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!commerceConfigured) return;
    void (async () => {
      const { data: { session } } = await browserDb().auth.getSession();
      if (!session) { setMessage("Sign in with a team account to view orders."); return; }
      const response = await fetch("/api/admin/orders", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) { setMessage("This account cannot view orders."); return; }
      setOrders(await response.json());
    })();
  }, []);
  return <div className="admin-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/admin">ADMIN</Link><span>/</span><span>ORDERS</span></div><div className="admin-title"><div><span className="eyebrow">IGNYTE / INTERNAL</span><h1>ORDERS<span>.</span></h1></div><Link href="/admin" className="button button-dark">PRODUCT MANAGER ↗</Link></div>{message && <p role="status">{message}</p>}
    <div className="admin-orders">{orders.map(order => <article key={order.id}><div className="admin-order-head"><strong>{order.id}</strong><span>{order.status.toUpperCase()} · {new Date(order.created_at).toLocaleString("en-AU")}</span></div><p>{order.customer_email ?? "Email pending"} · ${((order.total_cents ?? order.subtotal_cents) / 100).toFixed(2)} AUD</p><ul>{order.order_items.map((item, index) => <li key={index}>{item.product_name} / {item.size} · {item.sku} × {item.quantity}</li>)}</ul>{order.shipping_details?.address && <address>{order.shipping_details.name}<br />{order.shipping_details.address.line1}<br />{order.shipping_details.address.line2 && <>{order.shipping_details.address.line2}<br /></>}{order.shipping_details.address.city} {order.shipping_details.address.state} {order.shipping_details.address.postal_code}<br />{order.shipping_details.address.country}</address>}</article>)}</div>
  </div>;
}
