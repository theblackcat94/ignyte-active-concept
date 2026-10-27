import Link from "next/link";
import type { Metadata } from "next";
import PolicyCopy from "@/components/policy-copy";
import blocks from "@/data/policies/privacy-2026-07-31.json";
import "../support/support.css";
export const metadata: Metadata = { title: "Privacy | Ignyte Active" };
export default function PrivacyPage() { return <main className="support-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>PRIVACY</span></div><span className="eyebrow">IGNYTE / POLICIES</span><h1>PRIVACY<span>.</span></h1><PolicyCopy blocks={blocks} /><Link href="/contact" className="text-link">CONTACT US ↗</Link></main>; }
