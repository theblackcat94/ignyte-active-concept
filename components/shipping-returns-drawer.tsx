"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { RETURNS_LABEL, FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping-policy";
import { ReturnsIcon, ShippingIcon } from "./purchase-icons";
import "@/app/shipping-returns-drawer.css";

export default function ShippingReturnsDrawer({ section, onClose }: { section: "shipping" | "returns" | null; onClose: () => void }) {
  const drawer = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const returns = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!section) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const frame = requestAnimationFrame(() => {
      content.current?.scrollTo({ top: section === "returns" ? (returns.current?.offsetTop ?? 0) : 0 });
    });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !drawer.current) return;
      const focusable = [...drawer.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", onKeyDown); previous?.focus(); };
  }, [section, onClose]);

  if (!section) return null;
  return createPortal(<><button className="shipping-returns-backdrop" type="button" aria-label="Close shipping and returns" onClick={onClose} />
    <aside ref={drawer} className="bag-drawer shipping-returns-drawer is-open" role="dialog" aria-modal="true" aria-label="Shipping and returns">
      <div className="drawer-head"><div><span className="eyebrow">IGNYTE / HELP</span><h2>SHIPPING &amp; RETURNS_</h2></div><button ref={closeButton} type="button" className="icon-button" aria-label="Close shipping and returns" onClick={onClose}>×</button></div>
      <div ref={content} className="shipping-returns-content">
        <section><h3>SHIPPING &amp; DELIVERY</h3><div className="shipping-returns-callout"><ShippingIcon /><strong>FREE SHIPPING ON AU${FREE_SHIPPING_THRESHOLD_CENTS / 100}+ ORDERS</strong></div><p>Australian orders of AU${FREE_SHIPPING_THRESHOLD_CENTS / 100} or more after discounts receive free shipping. Standard shipping below the threshold is AU$15. Your delivery charge is confirmed at checkout.</p><p>Dispatch, tracking and delivery timing are confirmed with your order.</p><Link href="/returns/#shipping" onClick={onClose}>FULL SHIPPING POLICY ↗</Link></section>
        <section ref={returns}><div className="shipping-returns-callout"><ReturnsIcon /><strong>{RETURNS_LABEL}_</strong></div><p>Eligible full-price items can be returned for a change-of-mind refund or store credit when they arrive at our warehouse within 30 days of purchase.</p><p>Sale merchandise is final sale for change-of-mind returns. Items must be unworn, unused, unwashed, with original tags attached and proof of purchase. Faulty-item rights are unaffected.</p><p>Customers pay change-of-mind return postage. Original delivery charges are non-refundable. Every return is inspected before approval.</p><Link href="/returns/submit/" onClick={onClose}>START A RETURN ↗</Link><Link href="/returns/#returns" onClick={onClose}>VIEW FULL RETURNS POLICY ↗</Link></section>
      </div>
    </aside></>, document.body);
}
