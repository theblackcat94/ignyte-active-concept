import Link from "next/link";
import "@/app/free-returns.css";
import { FREE_RETURNS_LABEL } from "@/lib/shipping-policy";

export default function FreeReturnsReassurance({ compact = false }: { compact?: boolean }) {
  return <div className={`free-returns-reassurance${compact ? " is-compact" : ""}`}>
    <span aria-hidden="true" className="free-returns-check">✓</span>
    <strong>{FREE_RETURNS_LABEL}</strong>
    <Link href="/returns#free-returns">VIEW RETURNS POLICY ↗</Link>
  </div>;
}
