"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import "@/app/first-fit-promise/first-fit-promise.css";

export default function FirstFitPromiseView() {
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
  if (access === "loading") return <main className="first-fit-page section-wrap"><p>Loading preview…</p></main>;
  if (access === "private") return <main className="first-fit-page section-wrap"><span className="eyebrow">PRIVATE PREVIEW_</span><h1>THE FIRST FIT PROMISE™</h1><p>This programme is not available yet. Team members can sign in to review the development preview.</p><Link href="/account/">SIGN IN ↗</Link></main>;
  return <main className="first-fit-page section-wrap">
    {access === "preview" && <div className="first-fit-private-banner" role="status">PRIVATE DEVELOPMENT PREVIEW · Programme and exchange requests are OFF. Proposed terms await approval.</div>}
    <section className="first-fit-hero"><span className="eyebrow">IGNYTE ACTIVE / OUR PROMISE_</span><h1>YOUR FIRST FIT.<br /><em>OUR PROMISE.</em></h1><p className="first-fit-lead">New to IGNYTE? If the size isn&apos;t right, we&apos;ll help you get into one that is.</p><p>One complimentary size exchange on your first eligible full-price order. Terms apply.</p><Link href="/shop/" className="button button-orange">EXPLORE IGNYTE ↗</Link></section>
    <section className="first-fit-section"><span className="eyebrow">HOW IT WORKS_</span><div className="first-fit-steps">{[
      ["01 / FIND YOUR FIT", "Choose your IGNYTE pieces and complete your first order. Use our Size Guide and product fit advice to select your preferred size."],
      ["02 / TRY IT ON", "When your order arrives, carefully try on your new gear. If the size isn't quite right, let us know."],
      ["03 / REQUEST YOUR EXCHANGE", "Submit your request through our returns form and choose The First Fit Promise. Tell us which item you purchased and which size you'd prefer."],
      ["04 / WE'LL GET YOU SORTED", "Once your request is approved, follow the return instructions. We'll inspect the returned item and arrange your replacement size, subject to availability and eligibility."],
    ].map(([title, copy]) => <article key={title}><h2>{title}</h2><p>{copy}</p></article>)}</div></section>
    <section className="first-fit-section"><span className="eyebrow">THE DETAILS_</span><h2>One less thing to worry about.</h2><p>Proposed terms for review: one size exchange of one full-price item on a customer&apos;s first eligible IGNYTE order. The replacement would be the same product and colour in a different available size. The original must be unworn beyond careful fitting, unused, unwashed and tagged, and pass inspection.</p><p>The request window, postage arrangements and fulfilment process have not been approved. These proposed terms are not currently an active offer. Australian Consumer Law rights remain unaffected.</p></section>
    <section className="first-fit-section"><span className="eyebrow">FREQUENTLY ASKED QUESTIONS_</span>{[
      ["Is it available on every order?", "No. It is proposed for a first eligible full-price order only."],
      ["Can I change style or colour?", "The proposed benefit covers a size change in the same product and colour."],
      ["What if my preferred size is sold out?", "We'll contact you about available options and won't substitute another item automatically."],
      ["Can I get a refund instead?", "This is a proposed size exchange benefit. Refund eligibility follows the standard Returns & Refunds Policy."],
      ["What if my item is faulty?", "Australian Consumer Law rights apply independently and do not use this proposed exchange allowance."],
    ].map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    <section className="first-fit-section first-fit-final"><span className="eyebrow">LET&apos;S FIND YOUR FIT_</span><h2>Need a different size?</h2><p>The First Fit Promise request flow is currently disabled while terms and operations are reviewed.</p>{access === "preview" ? <Link className="first-fit-preview-cta" href="/returns/submit/?type=first-fit">PREVIEW THE SIZE EXCHANGE FORM ↗</Link> : <span className="first-fit-disabled-cta" aria-disabled="true">REQUEST A SIZE EXCHANGE ↗</span>}<div><Link href="/size-guide/">SIZE GUIDE ↗</Link><Link href="/returns/">STANDARD RETURNS POLICY ↗</Link></div></section>
  </main>;
}
