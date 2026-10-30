"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/components/store-provider";
import "../checkout.css";

type Result = { orderId: string; orderStatus: string; paymentStatus: string | null; guest: boolean };

function StripeSuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const { clearBag } = useStore();
  const [result, setResult] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!sessionId) return;
    void fetch(`/api/stripe/session?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setResult(data); if (data.paymentStatus === "paid") clearBag(); })
      .catch(() => setFailed(true));
  }, [sessionId, clearBag]);

  const invalidSession = !sessionId;
  const paid = result?.paymentStatus === "paid";
  const orderUrl = result ? result.guest ? `/guest/orders/${result.orderId}` : `/account/orders/${result.orderId}` : "/account";
  return <div className="checkout-page section-wrap checkout-confirmation">
    <span className="eyebrow">CHECKOUT / PAYMENT</span>
    <h1>{failed || invalidSession ? "PAYMENT STATUS" : paid ? "THANK YOU" : "PAYMENT RECEIVED"}<span>.</span></h1>
    <div className="checkout-panel">
      {failed || invalidSession ? <><h2>We could not load this payment</h2><p>Check your account or contact support before trying again.</p><Link className="button button-dark" href="/support">CONTACT SUPPORT ↗</Link></>
        : !result ? <><h2>Confirming your order</h2><p>Please wait while we retrieve your secure payment result.</p></>
        : <><h2>{paid ? "Your payment is confirmed" : "Your payment is processing"}</h2><p>Order <strong>{result.orderId}</strong>. {paid ? "A confirmation email will be sent shortly." : "Stripe has returned you to Ignyte. Your order status will update as soon as the payment confirmation is received."}</p><Link className="button button-dark" href={orderUrl}>VIEW ORDER ↗</Link></>}
    </div>
  </div>;
}

export default function StripeSuccessPage() {
  return <Suspense fallback={<div className="checkout-page section-wrap checkout-confirmation"><h1>CHECKING PAYMENT<span>.</span></h1></div>}><StripeSuccessContent /></Suspense>;
}
