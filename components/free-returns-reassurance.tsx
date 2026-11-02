import Link from "next/link";
import "@/app/free-returns.css";

export default function FreeReturnsReassurance({ compact = false }: { compact?: boolean }) {
  return <div className={`free-returns-reassurance${compact ? " is-compact" : ""}`}>
    <span aria-hidden="true" className="free-returns-check">✓</span>
    <strong>EASY, FAST &amp; FREE RETURNS</strong>
    <Link href="/returns#free-returns">VIEW RETURNS POLICY ↗</Link>
  </div>;
}
