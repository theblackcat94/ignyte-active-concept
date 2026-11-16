"use client";

import { useEffect, useRef } from "react";
import { money } from "@/lib/catalog";
import { FREE_SHIPPING_THRESHOLD_CENTS, qualifiesForFreeShipping } from "@/lib/shipping-policy";
import { IGNYTE_FLAME_PATH } from "./header-logo";
import "@/app/free-shipping-progress.css";

export default function FreeShippingProgress({ amountCents, celebrationId, open }: { amountCents: number; celebrationId?: number | null; open?: boolean }) {
  const progress = Math.max(0, Math.min(100, amountCents / FREE_SHIPPING_THRESHOLD_CENTS * 100));
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - amountCents);
  const eligible = qualifiesForFreeShipping(amountCents);
  const flame = useRef<SVGSVGElement>(null);
  const previous = useRef({ open: false, progress });
  useEffect(() => {
    const changed = open && (!previous.current.open || previous.current.progress !== progress);
    previous.current = { open: Boolean(open), progress };
    if (!changed || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const duration = 700;
    const animation = flame.current?.animate([
      { transform: "rotate(0deg) scale(1)", filter: "drop-shadow(0 0 0 transparent)" },
      { transform: "rotate(-6deg) translateX(-2px) scale(1.08)", filter: "drop-shadow(0 0 9px #ff4533)" },
      { transform: "rotate(5deg) translateX(2px) scale(1.04)", filter: "drop-shadow(0 0 6px #ff6b32)" },
      { transform: "rotate(0deg) scale(1)", filter: "drop-shadow(0 0 0 transparent)" },
    ], { duration, easing: "ease-in-out" });
    return () => animation?.cancel();
  }, [open, progress]);
  return <div className={`bag-shipping-progress ${eligible ? "is-unlocked" : ""} ${celebrationId != null ? "is-celebrating" : ""}${open !== undefined ? " has-flame-marker" : ""}`}>
    <strong role="status">{eligible ? "YOU'VE UNLOCKED FREE SHIPPING!" : `${money(remaining / 100)} AUD until free Australian shipping`}</strong>
    <div className="bag-shipping-visual">
      <div className="bag-shipping-track" role="progressbar" aria-label="Progress toward free Australian shipping" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
        <span style={{ width: `${progress}%` }} />
      </div>
      {open !== undefined && <div className="bag-shipping-marker-rail" aria-hidden="true"><span className="bag-shipping-marker" style={{ left: `${progress}%` }}><svg ref={flame} viewBox="0 0 36 72" fill="currentColor"><path d={IGNYTE_FLAME_PATH} /></svg></span></div>}
    </div>
    {celebrationId != null && <div key={celebrationId} className="bag-shipping-flames" aria-hidden="true">{[0, 1, 2, 3, 4].map(index => <svg key={index} viewBox="0 0 50 74" fill="currentColor"><path d="M16.3 63.6C8 48.9 24.7 34.3 23.1 23.2 36.6 40.7 29 76 0 71.3c0 0 21.6 11.2 35.7-9.6C49.9 40.9 28 12.2 28 12.2S20.7 1.4 20.6 0C16.4 20.6-8.2 40.8 16.3 63.6Z"/></svg>)}</div>}
  </div>;
}
