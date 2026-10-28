import { money } from "@/lib/catalog";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping-policy";
import "@/app/free-shipping-progress.css";

export default function FreeShippingProgress({ amountCents }: { amountCents: number }) {
  const progress = Math.max(0, Math.min(100, amountCents / FREE_SHIPPING_THRESHOLD_CENTS * 100));
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - amountCents);
  return <div className={`bag-shipping-progress ${remaining === 0 ? "is-unlocked" : ""}`}>
    <strong>{remaining === 0 ? "Free Australian shipping unlocked!" : `${money(remaining / 100)} AUD until free Australian shipping`}</strong>
    <div className="bag-shipping-track" role="progressbar" aria-label="Progress toward free Australian shipping" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
      <span style={{ width: `${progress}%` }} />
    </div>
    <small>Free shipping on eligible Australian orders of AU$100 or more after discounts.</small>
  </div>;
}
