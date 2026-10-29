"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/components/store-provider";

type Result = { status?: "paid" | "not_paid"; orderId?: string; guest?: boolean; error?: string };

export default function EwayPaymentResult({ accessCode }: { accessCode: string }) {
  const { clearBag } = useStore();
  const [result, setResult] = useState<Result | null>(null);
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

  const shown: Result | null = accessCode ? result : { error: "Payment reference is missing. Please contact support." };
  if (!shown) return <><h1>CHECKING PAYMENT<span>.</span></h1><div className="checkout-panel"><p role="status">Checking the result directly with eWAY...</p></div></>;
  if (shown.status === "paid") return <><h1>THANK YOU<span>.</span></h1>
    <div className="checkout-panel"><h2>Payment confirmed</h2><p>Your order {shown.orderId} has been paid.</p>
      <Link className="button button-dark" href={shown.guest ? `/guest/orders/${shown.orderId}` : `/account/orders/${shown.orderId}`}>
        VIEW ORDER DETAILS ↗</Link></div></>;
  return <><h1>PAYMENT NOT CONFIRMED<span>.</span></h1>
    <div className="checkout-panel"><p>{shown.error ?? "eWAY did not confirm a successful payment. Your order has not been marked paid."}</p>
      {shown.orderId && <p>Order reference: <strong>{shown.orderId}</strong></p>}
      <Link className="button button-dark" href="/contact/">CONTACT SUPPORT ↗</Link></div></>;
}
