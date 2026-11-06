import type { Metadata } from "next";
import Link from "next/link";
import "../support/support.css";

export const metadata: Metadata = {
  title: "Returns & Refunds | IGNYTE Active",
  description: "Eligible change-of-mind returns must arrive at IGNYTE's warehouse within 30 days of purchase. Read our conditions, postage terms and Australian Consumer Law information.",
};

export default function ReturnsPage() {
  return <main className="support-page returns-page section-wrap">
    <div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>RETURNS</span></div>
    <span className="eyebrow">IGNYTE / HELP &amp; SUPPORT</span>
    <h1>RETURNS &amp; REFUNDS<span>.</span></h1>
    <p className="returns-intro"><strong>Changed your mind? We&apos;ve got you.</strong></p>
    <p>We want you to feel confident shopping with IGNYTE. If something isn&apos;t quite right, we accept eligible items for a refund within 30 days of purchase.</p>
    <div className="policy-copy">
      <h2 id="shipping">Shipping</h2>
      <p>Australian orders under AU$100 after discounts have a flat AU$15 delivery charge. Orders of AU$100 or more after discounts receive free shipping. Your delivery charge is shown at checkout.</p>
      <span id="free-returns" className="returns-legacy-anchor" aria-hidden="true" /><h2 id="returns">Our 30-Day Returns Policy</h2>
      <p>To qualify for a change-of-mind return, your items must:</p>
      <ul className="policy-list"><li>Arrive at our returns warehouse within 30 calendar days of purchase.</li><li>Be unworn, unused and unwashed.</li><li>Have all original tags attached.</li><li>Be clean and in a condition suitable for resale.</li><li>Be accompanied by proof of purchase.</li><li>Not be marked as Final Sale.</li></ul>
      <p>You&apos;re welcome to carefully try on your items to check the fit, just as you would in a store. However, items must not have been worn for training, exercise or everyday use.</p>
      <p>Please allow enough time for return shipping. Your parcel must arrive at our warehouse within the 30-day period, not simply be posted before the deadline.</p>
      <h2>What about makeup or deodorant marks?</h2>
      <p>We understand small marks can occasionally occur when trying on clothing. Minor removable marks may be considered individually and won&apos;t necessarily result in an automatic rejection.</p>
      <p>However, items with significant staining, makeup, deodorant residue, perfume, body odour, sweat, damage or other signs of use may not be eligible for a change-of-mind refund.</p>
      <p>All returns are inspected upon arrival. Items requiring further assessment will be referred to the IGNYTE team. Our change-of-mind conditions do not affect your rights under Australian Consumer Law.</p>
      <h2>How to Make a Return</h2>
      <ol className="policy-steps">
        <li><h3>Get in touch</h3><p>Email <a href="mailto:support@ignyteactive.com">support@ignyteactive.com</a> with your order number and the item you&apos;d like to return. Our team will provide return instructions.</p></li>
        <li><h3>Prepare your items</h3><p>Ensure your items are unworn, unused, unwashed and have their original tags attached. Pack your items securely to protect them during shipping.</p></li>
        <li><h3>Include a return note</h3><p>Please include a handwritten or printed note inside your parcel with:</p><ul><li>Your full name</li><li>Your order number</li><li>Your email address</li><li>The items you&apos;re returning, including size and colour</li><li>Reason for return (optional)</li></ul><p>This helps our warehouse identify your return and process it without delays. You can also include a copy of your order confirmation.</p></li>
        <li><h3>Send your return</h3><p>Follow the instructions provided by our support team. Customers are responsible for return postage on change-of-mind returns. Please ensure your parcel arrives at our warehouse within 30 days of purchase. Do not send items back without contacting us first.</p></li>
        <li><h3>Return inspection</h3><p>Once your parcel arrives, our fulfilment partner will inspect the items against our returns conditions. Approved returns proceed to refund. Items that don&apos;t clearly meet our conditions may be held for additional assessment by IGNYTE. If your return is not approved, we&apos;ll contact you to discuss the outcome and next steps.</p></li>
        <li><h3>Receive your refund</h3><p>Approved change-of-mind returns will be refunded to the original payment method. Please allow additional time for your bank or payment provider to make the funds available.</p></li>
      </ol>
      <h2>Return Shipping Costs</h2>
      <p>For change-of-mind returns:</p><ul className="policy-list"><li>Customers are responsible for return postage.</li><li>Original shipping charges paid at checkout are non-refundable.</li><li>We recommend using a tracked postal service so you can confirm delivery.</li></ul>
      <p>These conditions do not limit your rights to remedies or applicable shipping cost reimbursement under Australian Consumer Law.</p>
      <h2>Final Sale Items</h2>
      <p>Items clearly marked Final Sale cannot be returned for a change-of-mind refund or store credit. Please review the product description, colour and size carefully before purchasing. This exclusion does not affect your rights under Australian Consumer Law.</p>
      <h2>Faulty, Damaged or Incorrect Items</h2>
      <p>If your item arrives faulty, damaged, incorrect or doesn&apos;t meet applicable consumer guarantees, please contact <a href="mailto:support@ignyteactive.com">support@ignyteactive.com</a> with your order number and details of the issue. Photos may help us resolve the problem more quickly.</p>
      <p>We&apos;ll assess the issue and provide an appropriate remedy under Australian Consumer Law, which may include a repair, replacement or refund depending on the circumstances. Where required by law, we&apos;ll cover or reimburse reasonable return shipping costs.</p>
      <p>The 30-day change-of-mind deadline, original tag requirements and Final Sale exclusions do not restrict your statutory consumer rights.</p>
      <h2>Need a Hand?</h2><p>For returns questions, sizing advice or help with an order, contact <a href="mailto:support@ignyteactive.com">support@ignyteactive.com</a>.</p>
      <p className="returns-signoff">MOVE WITH PURPOSE. TRAIN WITH FIRE.<br />IGNYTE ACTIVE · BUILT FOR THE BURN™</p>
    </div>
  </main>;
}
