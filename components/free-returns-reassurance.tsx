import Link from "next/link";
import "@/app/free-returns.css";
import { RETURNS_LABEL } from "@/lib/shipping-policy";

export default function FreeReturnsReassurance({ compact = false }: { compact?: boolean }) {
  return <div className={`free-returns-reassurance${compact ? " is-compact" : ""}`}>
    <span aria-hidden="true" className="free-returns-check">✓</span>
    <strong>{RETURNS_LABEL}</strong>
    <Link href="/returns#returns">VIEW RETURNS POLICY ↗</Link>
  </div>;
}
