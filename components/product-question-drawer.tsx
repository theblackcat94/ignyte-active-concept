"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Product } from "@/lib/catalog";
import ShippingReturnsDrawer from "./shipping-returns-drawer";
import "@/app/product-question-drawer.css";

const categories = ["Sizing & Fit", "Fabric & Product Details", "Shipping & Delivery", "Returns & Exchanges", "Stock & Availability", "Something Else"] as const;
type Category = typeof categories[number];

export default function ProductQuestionDrawer({ product, size, open, onClose, onGuide, onFit, onSizes }: {
  product: Product; size: string; open: boolean; onClose: () => void;
  onGuide: () => void; onFit: () => void; onSizes: () => void;
}) {
  const [category, setCategory] = useState<Category>("Sizing & Fit");
  const [formOpen, setFormOpen] = useState(false);
  const [policySection, setPolicySection] = useState<"shipping" | "returns" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const drawer = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const chooseCategory = (value: Category) => { setCategory(value); if (value === "Something Else") setFormOpen(true); };

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !drawer.current) return;
      const focusable = [...drawer.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled])')].filter(node => node.getClientRects().length > 0);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
      if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [open, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name, email, orderNumber, message: question, website: "",
        product: { id: product.plannerProductId || product.slug, slug: product.slug, name: product.name, url: window.location.href, color: product.color, size: size || null, category },
      }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send your question. Please try again.");
      setSent(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send your question. Please try again."); }
    finally { setBusy(false); }
  }

  const help = category === "Sizing & Fit" ? <><h3>LET&apos;S FIND YOUR FIT_</h3><p>Not sure which size to choose? Our Size Guide and product fit advice can help.</p><button onClick={onGuide}>VIEW SIZE GUIDE ↗</button><button onClick={onFit}>VIEW FIT &amp; FABRIC ↗</button></>
    : category === "Fabric & Product Details" ? <><h3>GET TO KNOW YOUR GEAR_</h3><p>Find out more about the fabric, features and care of this piece.</p><button onClick={onFit}>VIEW FIT &amp; FABRIC ↗</button></>
    : category === "Shipping & Delivery" ? <><h3>DELIVERY, SORTED_</h3><p>Find out about shipping costs, delivery information and our free shipping threshold.</p><button onClick={() => { onClose(); setPolicySection("shipping"); }}>VIEW SHIPPING INFO ↗</button></>
    : category === "Returns & Exchanges" ? <><h3>NEED TO RETURN SOMETHING?_</h3><p>Learn about our Easy 30 Day Returns policy and how to submit a return request.</p><button onClick={() => { onClose(); setPolicySection("returns"); }}>VIEW RETURNS POLICY ↗</button><Link href="/returns/submit/" onClick={onClose}>SUBMIT A RETURN ↗</Link></>
    : category === "Stock & Availability" ? <><h3>LOOKING FOR YOUR SIZE?_</h3><p>Check the available colours and sizes for this product.</p><button onClick={onSizes}>VIEW AVAILABLE SIZES ↗</button></> : null;

  return <>
    {open && createPortal(<><button type="button" className="product-question-backdrop" aria-label="Close product questions" onClick={onClose} />
      <aside ref={drawer} className="bag-drawer product-question-drawer is-open" role="dialog" aria-modal="true" aria-label="Ask a question about this product">
        <div className="drawer-head"><div><span className="eyebrow">HERE TO HELP_</span><h2>GOT A QUESTION?</h2></div><button ref={closeButton} type="button" className="icon-button" aria-label="Close product questions" onClick={onClose}>×</button></div>
        <div className="product-question-content">
          {sent ? <div role="status" className="product-question-success"><h3>MESSAGE RECEIVED_</h3><p>Thanks for reaching out. We&apos;ve received your question and will reply by email.</p></div> : <>
            <p>Need help choosing the right fit or want to know more about this piece? Let&apos;s get you sorted.</p>
            <div className="product-question-summary"><span className="eyebrow">ASKING ABOUT_</span><div><img src={product.image} alt="" /><p><strong>{product.name}</strong><span>{product.color}{size ? ` · Size ${size}` : ""}</span></p></div></div>
            <label className="product-question-category">WHAT CAN WE HELP WITH?_<select value={category} onChange={event => chooseCategory(event.target.value as Category)}>{categories.map(option => <option key={option}>{option}</option>)}</select></label>
            {help && <div className="product-question-help">{help}</div>}
            {!formOpen && <div className="product-question-invite"><h3>STILL NEED A HAND?_</h3><p>Didn&apos;t find what you were looking for? Send us a question and we&apos;ll get back to you.</p><button type="button" onClick={() => setFormOpen(true)}>ASK IGNYTE ↗</button></div>}
            <form className="product-question-form" onSubmit={submit} hidden={!formOpen}>
              <label>FULL NAME<input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></label>
              <label>EMAIL ADDRESS<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
              <label>QUESTION CATEGORY<select value={category} onChange={event => chooseCategory(event.target.value as Category)}>{categories.map(option => <option key={option}>{option}</option>)}</select></label>
              <label>YOUR QUESTION<textarea required minLength={10} maxLength={3600} rows={5} value={question} onChange={event => setQuestion(event.target.value)} /></label>
              <label>ORDER NUMBER (OPTIONAL)<input maxLength={100} value={orderNumber} onChange={event => setOrderNumber(event.target.value)} /></label>
              <button type="submit" className="button button-orange" disabled={busy}>{busy ? "SENDING…" : "SEND MY QUESTION ↗"}</button>
              {error && <p role="alert">{error}</p>}
            </form>
          </>}
        </div>
      </aside></>, document.body)}
    <ShippingReturnsDrawer section={policySection} onClose={() => setPolicySection(null)} />
  </>;
}
