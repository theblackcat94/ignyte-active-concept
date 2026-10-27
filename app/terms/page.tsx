import Link from "next/link";
import type { Metadata } from "next";
import PolicyCopy from "@/components/policy-copy";
import blocks from "@/data/policies/terms-2026-10-28.json";
import "../support/support.css";
export const metadata: Metadata = { title: "Terms of Service | Ignyte Active" };
export default function TermsPage() { return <main className="support-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>TERMS</span></div><span className="eyebrow">IGNYTE / POLICIES</span><h1>TERMS<span>.</span></h1><div className="policy-notice"><strong>Existing store terms copy</strong><p>Reproduced from Ignyte Active&apos;s existing website. Its payment and delivery provisions describe the existing store, not this custom preview. Terms for this checkout still require review before merchant payments are enabled.</p></div><PolicyCopy blocks={blocks} /><Link href="/contact" className="text-link">CONTACT US ↗</Link></main>; }
