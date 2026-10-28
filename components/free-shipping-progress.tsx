"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/catalog";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping-policy";
import "@/app/free-shipping-progress.css";

export default function FreeShippingProgress({ amountCents }: { amountCents: number }) {
  const progress = Math.max(0, Math.min(100, amountCents / FREE_SHIPPING_THRESHOLD_CENTS * 100));
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - amountCents);
  const eligible = remaining === 0;
  const previousEligible = useRef(eligible);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (eligible && !previousEligible.current) setCelebrating(true);
    previousEligible.current = eligible;
  }, [eligible]);
  return <div className={`bag-shipping-progress ${remaining === 0 ? "is-unlocked" : ""}`}>
    <strong>{remaining === 0 ? "Free Australian shipping unlocked!" : `${money(remaining / 100)} AUD until free Australian shipping`}</strong>
    <div className="bag-shipping-track" role="progressbar" aria-label="Progress toward free Australian shipping" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
      <span style={{ width: `${progress}%` }} />
    </div>
    {celebrating && <div className="bag-shipping-flames" aria-hidden="true" onAnimationEnd={() => setCelebrating(false)}>{[0, 1, 2, 3, 4].map(index => <svg key={index} viewBox="0 0 50 74" fill="currentColor"><path d="M16.3 63.6C8 48.9 24.7 34.3 23.1 23.2 36.6 40.7 29 76 0 71.3c0 0 21.6 11.2 35.7-9.6C49.9 40.9 28 12.2 28 12.2S20.7 1.4 20.6 0C16.4 20.6-8.2 40.8 16.3 63.6Z"/></svg>)}</div>}
    <small>Free shipping on eligible Australian orders of AU$100 or more after discounts.</small>
  </div>;
}
