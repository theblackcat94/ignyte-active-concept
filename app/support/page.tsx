import Link from "next/link";
import type { Metadata } from "next";
import "./support.css";
export const metadata: Metadata = { title: "Support & FAQ | Ignyte Active" };
const faqs = [
  ["Can I check out without an account?", "Yes. Submit an Australian delivery address and email at checkout. Guest order details remain accessible from the same browser."],
  ["Is payment taken at checkout?", "No. Checkout currently records an order request. The team will confirm shipping and payment details before fulfilment."],
  ["Where do you deliver?", "This custom store currently accepts Australian delivery addresses only. Delivery rates will be confirmed before payment."],
  ["Can I see my order?", "Signed-in customers can view order history and details in Your Account. Guest customers can open the order link shown after checkout in the same browser."],
  ["How do I contact the team?", "Use the contact form below. Include your order number if you have one."],
];
export default function SupportPage() { return <main className="support-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>SUPPORT</span></div><span className="eyebrow">IGNYTE / HELP</span><h1>SUPPORT<span>.</span></h1><p>Answers about this custom store and your order requests.</p><h2>FREQUENTLY ASKED QUESTIONS</h2><div className="support-faq">{faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div><div className="support-card"><h2>Need more help?</h2><p>Send a message directly to the Ignyte team.</p><Link className="button button-dark" href="/contact">CONTACT US ↗</Link></div></main>; }
