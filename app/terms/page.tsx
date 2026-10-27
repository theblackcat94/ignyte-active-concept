import Link from "next/link";
import type { Metadata } from "next";
import "../support/support.css";
export const metadata: Metadata = { title: "Terms of Service | Ignyte Active" };
export default function TermsPage() { return <main className="support-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>TERMS</span></div><span className="eyebrow">IGNYTE / POLICIES</span><h1>TERMS<span>.</span></h1><div className="support-card"><p>Terms specific to this custom store are being prepared. Please review the <a href="https://ignyteactive.com/terms-conditions">current Ignyte Active terms and conditions</a> and contact us with any questions before placing an order request. No payment is collected through this checkout at present.</p><Link href="/contact" className="text-link">CONTACT US ↗</Link></div></main>; }
