import type { Metadata } from "next";
import Link from "next/link";
import "../support/support.css";

export const metadata: Metadata = { title: "Returns policy | Ignyte Active", description: "Returns information and Australian consumer rights for Ignyte Active." };

export default function ReturnsPage() {
  return <main className="support-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>RETURNS</span></div><span className="eyebrow">IGNYTE / HELP & SUPPORT</span><h1>RETURNS<span>.</span></h1>
    <div className="policy-notice"><strong>Returns process under review</strong><p>We’re confirming the change-of-mind window, prepaid label process and delivery charges with our fulfilment partner. We’ll publish the final policy here before taking online payments. Please <Link href="/contact">contact us</Link> before sending an item back.</p></div>
    <div className="policy-copy"><h2>Your Australian Consumer Law rights</h2><p>Nothing in our terms excludes, restricts or modifies your rights under the Australian Consumer Law. Goods must be of acceptable quality, fit for any disclosed purpose and match their description. If a product has a major failure, you may choose a refund or replacement. For a minor failure, we may offer a repair or replacement.</p><h2>How returns are handled</h2><p>Our fulfilment partner inspects returned items. Items reported as defective are quarantined for Ignyte’s inspection. Any applicable refund is processed to the original payment method after the goods have been received and inspected.</p><p>Change-of-mind returns, eligibility, timeframes, hygiene or wear restrictions, and return postage arrangements are awaiting the final published policy.</p><p>See the <Link href="/terms">Terms of Service</Link> for the existing store’s full terms.</p></div>
  </main>;
}
