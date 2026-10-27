import type { Metadata } from "next";
import Link from "next/link";
import "../support/support.css";

export const metadata: Metadata = { title: "Returns policy | Ignyte Active", description: "Returns information and Australian consumer rights for Ignyte Active." };

export default function ReturnsPage() {
  return <main className="support-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>RETURNS</span></div><span className="eyebrow">IGNYTE / HELP & SUPPORT</span><h1>RETURNS<span>.</span></h1>
    <div className="policy-notice"><strong>Returns process under review</strong><p>Australian orders of $100 or more receive free shipping. We’re confirming delivery rates for smaller orders, the change-of-mind window and prepaid return labels with our fulfilment partner. We’ll publish the final returns policy before taking online payments. Please <Link href="/contact">contact us</Link> before sending an item back.</p></div>
    <div className="policy-copy"><h2>Your Australian Consumer Law rights</h2><p>Nothing in our terms excludes, restricts or modifies your rights under the Australian Consumer Law. Goods must be of acceptable quality, fit for any disclosed purpose and match their description. If a product has a major failure, you may choose a refund or replacement. For a minor failure, we will provide an appropriate remedy within a reasonable time.</p><h2>How returns are handled</h2><p>Our fulfilment partner inspects returned items. Items reported as defective are quarantined for Ignyte’s inspection. Eligible refunds are processed to the original payment method. Inspection does not limit your Australian Consumer Law rights.</p><p>Change-of-mind returns, eligibility, timeframes, hygiene or wear restrictions, and return postage arrangements are awaiting the final published policy.</p><p>See the <Link href="/terms">Terms of Service</Link> for the existing store’s full terms.</p></div>
  </main>;
}
