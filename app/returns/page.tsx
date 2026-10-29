import type { Metadata } from "next";
import Link from "next/link";
import "../support/support.css";

export const metadata: Metadata = { title: "Returns policy | Ignyte Active", description: "Returns information and Australian consumer rights for Ignyte Active." };

export default function ReturnsPage() {
  return <main className="support-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>RETURNS</span></div><span className="eyebrow">IGNYTE / HELP & SUPPORT</span><h1>RETURNS<span>.</span></h1>
    <p>Need help with a return? <Link href="/contact">Contact our team</Link> with your order number before sending an item back. We’ll explain the next steps and any return postage arrangements.</p>
    <div className="policy-copy"><h2>Shipping</h2><p>Australian orders under AU$100 after discounts have a flat AU$15 delivery charge. Orders of AU$100 or more after discounts receive free shipping. Your delivery charge is shown at checkout.</p><h2>Your Australian Consumer Law rights</h2><p>Nothing in our terms excludes, restricts or modifies your rights under the Australian Consumer Law. Goods must be of acceptable quality, fit for any disclosed purpose and match their description. If a product has a major failure, you may choose a refund or replacement. For a minor failure, we will provide an appropriate remedy within a reasonable time.</p><h2>How returns are handled</h2><p>Our fulfilment partner inspects returned items. Items reported as defective are quarantined for Ignyte’s inspection. Eligible refunds are processed to the original payment method. Inspection does not limit your Australian Consumer Law rights.</p><p>For change-of-mind requests, contact us to check eligibility and the return process before sending your item.</p><p>Read our <Link href="/terms">Terms of Service</Link> for more information.</p></div>
  </main>;
}
