"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import FirstFitExchangeForm from "./first-fit-exchange-form";
import "@/app/first-fit-promise/first-fit-promise.css";

export default function FirstFitExchangePreview() {
  const [access, setAccess] = useState<"loading" | "private" | "preview" | "public">("loading");
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const token = commerceConfigured ? (await browserDb().auth.getSession()).data.session?.access_token : null;
      const response = await fetch("/api/first-fit/preview", { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
      if (!cancelled) setAccess(response.ok ? (await response.json()).preview ? "preview" : "public" : "private");
    }
    void check();
    return () => { cancelled = true; };
  }, []);
  if (access === "loading") return <main className="return-submit-page section-wrap"><p>Loading preview…</p></main>;
  if (access === "private") return <main className="return-submit-page section-wrap"><span className="eyebrow">PRIVATE PREVIEW_</span><h1>THE FIRST FIT PROMISE™</h1><p>This exchange programme is not available yet.</p><Link href="/returns/submit/">STANDARD RETURN REQUEST ↗</Link></main>;
  if (access === "public") return <FirstFitExchangeForm />;
  return <main className="return-submit-page section-wrap first-fit-request-preview"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/first-fit-promise/">THE FIRST FIT PROMISE</Link><span>/</span><span>REQUEST</span></div>
    <div className="first-fit-private-banner">PRIVATE DEVELOPMENT PREVIEW · Requests cannot be submitted until the terms and fulfilment process are approved.</div>
    <span className="eyebrow">THE FIRST FIT PROMISE™_</span><h1>LET&apos;S GET YOUR FIT RIGHT.</h1><p>Use your verified order to select an eligible full-price item and request another size in the same product and colour. The active form will check purchase history and available stock before submission.</p>
    <form className="return-form" onSubmit={event => event.preventDefault()}><fieldset><legend>YOUR ORDER_</legend><div className="return-fields"><label>Order number<input disabled placeholder="Order number" /></label><label>Email address<input disabled type="email" placeholder="Email used at checkout" /></label><label>Customer name<input disabled placeholder="Full name" /></label></div><p className="return-hint">Orders will be shown only after signed-in or verified guest access; an order number alone is not enough.</p></fieldset>
      <fieldset><legend>YOUR EXCHANGE_</legend><div className="return-fields"><label>Product being exchanged<input disabled placeholder="Select a purchased item" /></label><label>Current size<input disabled placeholder="Size on your order" /></label><label>Requested replacement size<input disabled placeholder="Choose an available size" /></label><label>Colour<input disabled placeholder="Same colour as purchased" /></label><label>Reason for sizing issue<textarea disabled rows={3} placeholder="Tell us how the current size fits" /></label><label>Additional comments (optional)<textarea disabled rows={3} /></label></div></fieldset>
      <button className="button button-orange" disabled>REQUEST A SIZE EXCHANGE ↗</button></form><p><Link href="/returns/submit/">USE THE STANDARD RETURNS FORM ↗</Link></p>
  </main>;
}
