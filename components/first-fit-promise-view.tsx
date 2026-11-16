"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import "@/app/first-fit-promise/first-fit-promise.css";

export default function FirstFitPromiseView() {
  const [access, setAccess] = useState<"loading" | "private" | "preview" | "public">("loading");
  const [terms, setTerms] = useState<{ request_window_days: number; return_postage: string; replacement_postage: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function check() {
      const token = commerceConfigured ? (await browserDb().auth.getSession()).data.session?.access_token : null;
      const response = await fetch("/api/first-fit/preview", { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store" });
      if (!cancelled) {
        if (!response.ok) setAccess("private");
        else { const result = await response.json(); setTerms(result.terms || null); setAccess(result.preview ? "preview" : "public"); }
      }
    }
    void check();
    return () => { cancelled = true; };
  }, []);
  if (access === "loading") return <main className="first-fit-page section-wrap"><p>Loading preview…</p></main>;
  if (access === "private") return <main className="first-fit-page section-wrap"><span className="eyebrow">PRIVATE PREVIEW_</span><h1>THE FIRST FIT PROMISE™</h1><p>This programme is not available yet. Team members can sign in to review the development preview.</p><Link href="/account/">SIGN IN ↗</Link></main>;
  return <main className="first-fit-page section-wrap">
    {access === "preview" && <div className="first-fit-private-banner" role="status">DEVELOPMENT PREVIEW · Programme and exchange requests are OFF. Proposed terms await approval.</div>}
    <section className="first-fit-hero"><span className="eyebrow">IGNYTE ACTIVE / OUR PROMISE_</span><h1>THE FIRST FIT PROMISE™</h1><h2>YOUR FIRST FIT. OUR PROMISE.</h2><p className="first-fit-benefit">ONE COMPLIMENTARY SIZE EXCHANGE ON YOUR FIRST ELIGIBLE FULL-PRICE ORDER.</p><p className="first-fit-lead">New to IGNYTE? If the size isn&apos;t right, we&apos;ll help you get into one that is.</p><p>Terms apply. {access === "preview" && "This benefit and its request flow are currently off while the final terms are reviewed."}</p><Link href="/shop/" className="button button-orange">EXPLORE IGNYTE ↗</Link></section>
    <section className="first-fit-section first-fit-how"><h2>HOW IT WORKS_</h2><div className="first-fit-steps">{[
      ["01 / FIND YOUR FIT", "Choose your first IGNYTE pieces using our Size Guide and fit advice."],
      ["02 / TRY IT ON", "Carefully try on your new gear. If the size isn't right, let us know."],
      ["03 / REQUEST YOUR FREE SIZE EXCHANGE", "Submit a First Fit Promise request through our existing returns form."],
      ["04 / WE'LL GET YOU SORTED", "Once the return passes inspection, we'll arrange the approved replacement size."],
    ].map(([title, copy]) => <article key={title}><h2>{title}</h2><p>{copy}</p></article>)}</div></section>
    <section className="first-fit-section"><span className="eyebrow">THE DETAILS_</span><h2>One less thing to worry about.</h2><p>{access === "preview" ? "Proposed terms for review: " : "The benefit covers "}one size exchange of one full-price item on a customer&apos;s first eligible IGNYTE order. The replacement would be the same product and colour in a different available size. The original must be unworn beyond careful fitting, unused, unwashed and tagged, and pass inspection.</p>{access === "preview" ? <p>The request window, postage arrangements and fulfilment process have not been approved. These proposed terms are not currently an active offer.</p> : terms && <p>Request within {terms.request_window_days} days of recorded delivery. {terms.return_postage === "ignyte" ? "IGNYTE covers standard return postage." : "You pay return postage."} {terms.replacement_postage === "ignyte" ? "IGNYTE covers standard replacement delivery." : "You pay replacement delivery."} We&apos;ll send approved instructions after reviewing your request.</p>}<p>Australian Consumer Law rights remain unaffected. <Link href="/returns/">Read our Returns &amp; Refunds Policy.</Link></p></section>
    <section className="first-fit-section"><span className="eyebrow">FREQUENTLY ASKED QUESTIONS_</span>{[
      ["Is it available on every order?", "No. It is for a first eligible full-price order only."],
      ["Can I change style or colour?", "The benefit covers a size change in the same product and colour."],
      ["How do I request an exchange?", "Use the First Fit Promise option in our returns form. We'll review your first-order eligibility, the item condition and replacement stock before approving an exchange."],
      ["Who pays postage?", access === "preview" ? "Return and replacement postage arrangements are still being finalised. No postage benefit is active yet." : terms?.return_postage === "ignyte" && terms?.replacement_postage === "ignyte" ? "IGNYTE covers approved standard return and replacement delivery for one eligible exchange." : "See the approved exchange instructions for the applicable return and replacement delivery charges."],
      ["Is this the same as Easy 30 Day Returns?", "No. The First Fit Promise is a limited first-purchase size exchange. Our standard Returns & Refunds Policy applies separately."],
      ["What if my preferred size is sold out?", "We'll contact you about available options and won't substitute another item automatically."],
      ["Can I get a refund instead?", "This is a proposed size exchange benefit. Refund eligibility follows the standard Returns & Refunds Policy."],
      ["What if my item is faulty?", "Australian Consumer Law rights apply independently and do not use this proposed exchange allowance."],
    ].map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
    <section className="first-fit-section first-fit-final"><span className="eyebrow">LET&apos;S FIND YOUR FIT_</span><h2>Need a different size?</h2>{access === "preview" ? <><p>The First Fit Promise request flow is currently disabled while terms and operations are reviewed.</p><Link className="first-fit-preview-cta" href="/returns/submit/?type=first-fit">PREVIEW THE SIZE EXCHANGE FORM ↗</Link></> : <Link className="first-fit-preview-cta" href="/returns/submit/?type=first-fit">REQUEST A SIZE EXCHANGE ↗</Link>}<div><Link href="/size-guide/">SIZE GUIDE ↗</Link><Link href="/returns/">STANDARD RETURNS POLICY ↗</Link></div></section>
  </main>;
}
