"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/components/store-provider";
import OrderItemsList from "@/components/order-items-list";
import { money } from "@/lib/catalog";
import { browserDb } from "@/lib/commerce";
import { orderSelect, type OrderDetail } from "@/lib/order";
import "@/app/order-detail.css";

type Result = { status?: "paid" | "not_paid"; orderId?: string; guest?: boolean; error?: string };

export default function EwayPaymentResult({ accessCode }: { accessCode: string }) {
  const { clearBag } = useStore();
  const [result, setResult] = useState<Result | null>(null);
  const [receipt, setReceipt] = useState<OrderDetail | null>(null);
  const [receiptError, setReceiptError] = useState(false);
  useEffect(() => {
    if (!accessCode) return;
    let active = true;
    void fetch(`/api/eway/result?AccessCode=${encodeURIComponent(accessCode)}`, { cache: "no-store" })
      .then(async response => ({ response, data: await response.json() as Result }))
      .then(({ response, data }) => {
        if (!active) return;
        if (response.ok && data.status === "paid") clearBag();
        setResult(data);
      })
      .catch(() => { if (active) setResult({ error: "Payment could not be checked. Please contact support." }); });
    return () => { active = false; };
  }, [accessCode, clearBag]);

  useEffect(() => {
    if (result?.status !== "paid" || !result.orderId) return;
    let active = true;
    const load = async () => {
      try {
        let detail: OrderDetail | null = null;
        if (result.guest) {
          const response = await fetch(`/api/guest-orders/${result.orderId}`, { cache: "no-store" });
          if (!response.ok) throw new Error("Guest order unavailable");
          detail = await response.json() as OrderDetail;
        } else {
          const db = browserDb();
          const { data: { session } } = await db.auth.getSession();
          if (!session) throw new Error("Account session unavailable");
          const { data, error } = await db.from("orders").select(orderSelect).eq("id", result.orderId).maybeSingle();
          if (error || !data) throw new Error("Order unavailable");
          detail = data as OrderDetail;
        }
        if (active) setReceipt(detail);
      } catch {
        if (active) setReceiptError(true);
      }
    };
    void load();
    return () => { active = false; };
  }, [result]);

  const shown: Result | null = accessCode ? result : { error: "Payment reference is missing. Please contact support." };
  if (!shown) return <><h1>CHECKING PAYMENT<span>.</span></h1><div className="checkout-panel"><p role="status">Checking the result directly with eWAY...</p></div></>;
  if (shown.status === "paid") return <><h1>THANK YOU<span>.</span></h1>
    <div className="checkout-panel checkout-receipt"><h2>Payment confirmed</h2><p>Your order {shown.orderId} has been paid.</p>
      {receipt && <><h3>Your order</h3><OrderItemsList items={receipt.order_items} />{typeof receipt.total_cents === "number" && <div className="checkout-total"><span>Total paid</span><strong>{money(receipt.total_cents / 100)}</strong></div>}</>}
      {!receipt && !receiptError && <p role="status">Loading your order items…</p>}
      {receiptError && <p role="status">Your receipt is available through View Order Details.</p>}
      <Link className="button button-dark" href={shown.guest ? `/guest/orders/${shown.orderId}` : `/account/orders/${shown.orderId}`}>
        VIEW ORDER DETAILS ↗</Link></div></>;
  return <><h1>PAYMENT NOT CONFIRMED<span>.</span></h1>
    <div className="checkout-panel"><p>{shown.error ?? "eWAY did not confirm a successful payment. Your order has not been marked paid."}</p>
      {shown.orderId && <p>Order reference: <strong>{shown.orderId}</strong></p>}
      <Link className="button button-dark" href="/contact/">CONTACT SUPPORT ↗</Link></div></>;
}
