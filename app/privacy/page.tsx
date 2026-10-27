import Link from "next/link";
import type { Metadata } from "next";
import "../support/support.css";
export const metadata: Metadata = { title: "Privacy | Ignyte Active" };
export default function PrivacyPage() { return <main className="support-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>PRIVACY</span></div><span className="eyebrow">IGNYTE / POLICIES</span><h1>PRIVACY<span>.</span></h1><div className="support-card"><p>The privacy policy for this custom store is being prepared. Before submitting personal details, please review the <a href="https://ignyteactive.com/privacy-policy">current Ignyte Active privacy policy</a>. Contact us if you need clarification about data submitted through this site.</p><Link href="/contact" className="text-link">CONTACT US ↗</Link></div></main>; }
