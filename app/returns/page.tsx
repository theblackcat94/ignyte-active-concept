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
      <span id="free-returns" className="returns-legacy-anchor" aria-hidden="true" /><h2 id="returns">Our Easy 30 Day Returns Policy</h2>
      <p>To qualify for a change-of-mind return, your items must:</p>
      <ul className="policy-list"><li>Arrive at our returns warehouse within 30 calendar days of purchase.</li><li>Be unworn, unused and unwashed.</li><li>Have all original tags attached.</li><li>Be accompanied by proof of purchase.</li><li>Be purchased at full price and not marked as a sale item.</li></ul>
      <p>You&apos;re welcome to carefully try on your items to check the fit, just as you would in a store. However, items must not have been worn for training, exercise or everyday use.</p>
      <p>Please allow enough time for return shipping. Your parcel must arrive at our warehouse within the 30-day period, not simply be posted before the deadline.</p>
      <h2>What about makeup or deodorant marks?</h2>
      <p>We understand small marks can occasionally occur when trying on clothing. Minor removable marks may be considered individually and won&apos;t necessarily result in an automatic rejection.</p>
      <p>However, items with significant staining, makeup, deodorant residue, perfume, body odour, sweat, damage or other signs of use may not be eligible for a change-of-mind refund.</p>
      <p>All returns are inspected upon arrival. Items requiring further assessment will be referred to the IGNYTE team. Our change-of-mind conditions do not affect your rights under Australian Consumer Law.</p>
      <h2>How to Make a Return</h2>
      <ol className="policy-steps">
        <li><h3>Submit a request</h3><p>Submit a return request with your order number and the items you&apos;d like to return. Our team will review it and provide return instructions.</p><Link className="button button-orange returns-start-cta" href="/returns/submit/">START A RETURN ↗</Link></li>
        <li><h3>Prepare your items</h3><p>Ensure your items are unworn, unused, unwashed and have their original tags attached. Pack your items securely to protect them during shipping.</p></li>
        <li><h3>Include your return reference</h3><p>Once approved to send, include your IGNYTE return reference, name and order number inside the parcel. This helps our warehouse identify your return. You can also include a copy of your order confirmation.</p></li>
        <li><h3>Send your return</h3><p>Follow the instructions provided by our support team. Customers are responsible for return postage on change-of-mind returns. Please ensure your parcel arrives at our warehouse within 30 days of purchase. Do not send items back without contacting us first.</p></li>
        <li><h3>Return inspection</h3><p>Once your parcel arrives, our fulfilment partner will inspect the items against our returns conditions. Approved returns proceed to the selected resolution. Items that don&apos;t clearly meet our conditions may be held for additional assessment by IGNYTE. If your return is not approved, we&apos;ll contact you to discuss the outcome and next steps.</p></li>
        <li><h3>Receive your approved item value</h3><p>For eligible full-price change-of-mind returns, choose store credit or a refund to the original payment method. Both are issued only after inspection and approval. Original delivery charges are excluded.</p></li>
      </ol>
      <h2>Return Shipping Costs</h2>
      <p>For change-of-mind returns:</p><ul className="policy-list"><li>Customers are responsible for return postage.</li><li>Original shipping charges paid at checkout are non-refundable.</li><li>We recommend using a tracked postal service so you can confirm delivery.</li></ul>
      <p>These conditions do not limit your rights to remedies or applicable shipping cost reimbursement under Australian Consumer Law.</p>
      <h2>Sale Items</h2>
      <p>All sale items are final sale and cannot be returned for a change-of-mind refund or store credit. This applies to merchandise purchased at a reduced sale price. Please review product details, sizing and colours carefully before completing your purchase.</p>
      <p>This exclusion does not affect your rights under Australian Consumer Law. If an item is faulty, incorrectly described or otherwise fails to meet applicable consumer guarantees, you may still be entitled to a remedy. An ordinary promotional discount code does not by itself make a full-price item a sale item.</p>
      <h2>Returns Due to Sizing</h2><p>Ordered the wrong size or didn&apos;t quite get the fit right? You can return eligible full-price items within our 30-day returns period, provided they meet our return conditions. Choose store credit or a refund for the returned item value. Original shipping charges are non-refundable, and customers pay return postage.</p><p>If you bought two sizes and keep one, you can return the unused size for the amount paid for that item, subject to eligibility. Incorrectly labelled, misdescribed or faulty items may involve separate Australian Consumer Law rights.</p>
      <h2>Choose Your Refund Option</h2><p>For eligible full-price returns, you can request store credit for the approved item value after inspection, or a refund of that value to your original payment method. Bank processing may take additional time. Store credit terms and refund processing timing will be confirmed before those options are activated; we are not promising a seven-day processing window yet.</p>
      <h2>Faulty, Damaged or Incorrect Items</h2>
      <p>If your item arrives faulty, damaged, incorrect or doesn&apos;t meet applicable consumer guarantees, please contact <a href="mailto:support@ignyteactive.com">support@ignyteactive.com</a> with your order number and details of the issue. Photos may help us resolve the problem more quickly.</p>
      <p>We&apos;ll assess the issue and provide an appropriate remedy under Australian Consumer Law, which may include a repair, replacement or refund depending on the circumstances. Where required by law, we&apos;ll cover or reimburse reasonable return shipping costs.</p>
      <p>The 30-day change-of-mind deadline, original tag requirements and Final Sale exclusions do not restrict your statutory consumer rights.</p>
      <h2>Need a Hand?</h2><p>For returns questions, sizing advice or help with an order, contact <a href="mailto:support@ignyteactive.com">support@ignyteactive.com</a>.</p>
      <p className="returns-signoff">MOVE WITH PURPOSE. TRAIN WITH FIRE.<br />IGNYTE ACTIVE · BUILT FOR THE BURN™</p>
    </div>
  </main>;
}
