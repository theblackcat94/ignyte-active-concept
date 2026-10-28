import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./support.css";

export const metadata: Metadata = { title: "Support & FAQ | Ignyte Active" };

type Faq = { question: string; answer: ReactNode };
const groups: { title: string; questions: Faq[] }[] = [
  {
    title: "Sizing & product care",
    questions: [
      { question: "How do I choose my size?", answer: <>Open the size guide on the product page to compare your body measurements with the relevant chart. Check the fit notes and model details too. If you’re unsure, <Link href="/contact">contact us</Link> and we’ll help you choose.</> },
      { question: "Do all IGNYTE products fit the same way?", answer: "Fit varies by style, fabric and intended use. Check each product page for its fit guidance, including whether it runs true to size, small or large." },
      { question: "How should I wash my activewear?", answer: "Wash inside out at 30°C on a gentle cycle with similar colours and a mild detergent. Avoid fabric softener and bleach, then air dry in the shade. Do not tumble dry, iron or dry clean. Always follow your garment’s care label." },
    ],
  },
  {
    title: "Orders & payment",
    questions: [
      { question: "Can I check out without an account?", answer: "Yes. Submit an Australian delivery address and email at checkout. Guest order details remain accessible from the same browser." },
      { question: "Is payment taken at checkout?", answer: "No. Checkout currently records an order request. The team will confirm shipping and payment details before fulfilment." },
      { question: "Can I change or cancel my order?", answer: <>Email <a href="mailto:support@ignyteactive.com">support@ignyteactive.com</a> as soon as possible with your order number and the change you’d like to make. The team will confirm what is possible based on your order’s status.</> },
      { question: "Which payment methods do you accept?", answer: "Online payment is not connected yet. The team will confirm payment options before an order is fulfilled." },
      { question: "I haven’t received my order confirmation. What should I do?", answer: <>The order details link appears after checkout; guest customers can reopen it in the same browser. Automated confirmation emails are not enabled yet. If you need help finding your order, email <a href="mailto:support@ignyteactive.com">support@ignyteactive.com</a> with the name and email address used at checkout.</> },
      { question: "Can I see my order?", answer: "Signed-in customers can view order history and details in Your Account. Guest customers can open the order link shown after checkout in the same browser." },
    ],
  },
  {
    title: "Shipping & returns",
    questions: [
      { question: "Where do you deliver?", answer: "We currently deliver within Australia. We’ll confirm your delivery cost before payment." },
      { question: "Do you offer free shipping?", answer: <>Yes. Australian orders of AU$100 or more after discounts receive free shipping. See the shipping information on our <Link href="/returns">Returns page</Link>.</> },
      { question: "When will my order arrive?", answer: "Delivery times depend on your location and shipping method. Estimated dispatch and delivery times have not yet been confirmed with our fulfilment partner; contact us if you need an update on an order." },
      { question: "How do I return an item?", answer: <>Contact our team before sending an item back. We’ll explain eligibility, the return steps and any postage arrangements. Read the <Link href="/returns">Returns page</Link> for the current policy.</> },
      { question: "What if I receive an incorrect or faulty item?", answer: <>Email <a href="mailto:support@ignyteactive.com">support@ignyteactive.com</a> with your order number, a description of the issue and clear photos where relevant. We’ll review the details and help with the next steps.</> },
    ],
  },
];

export default function SupportPage() {
  return <main className="support-page section-wrap">
    <div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>SUPPORT</span></div>
    <span className="eyebrow">IGNYTE / HELP</span><h1>SUPPORT<span>.</span></h1>
    <p>Answers to common questions about shopping with Ignyte.</p>
    {groups.map(group => <section key={group.title} aria-label={group.title}><h2>{group.title.toUpperCase()}</h2><div className="support-faq">{group.questions.map(({ question, answer }) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>)}
    <div className="support-card"><h2>Need more help?</h2><p>Visit our <Link href="/contact">Contact page</Link> to send us a message.</p></div>
  </main>;
}
