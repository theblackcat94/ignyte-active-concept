"use client";

import Link from "next/link";
import { useState } from "react";
import { asset } from "@/lib/asset";
import { CurrencySelector } from "./currency-estimate";

const footerLinks = [
  { title: "HELP & SUPPORT", items: [
    { label: "Support & FAQ", href: "/support" },
    { label: "Contact", href: "/contact" },
    { label: "Size guide", href: "/size-guide" },
    { label: "Returns policy", href: "/returns" },
  ] },
  { title: "SHOP", items: [
    { label: "Shop all", href: "/shop" },
    { label: "Sports bras", href: "/shop/sports-bras" },
    { label: "Tops", href: "/shop/tops" },
    { label: "Leggings", href: "/shop/leggings" },
    { label: "Shorts", href: "/shop/shorts" },
  ] },
  { title: "EXPLORE", items: [
    { label: "Our story", href: "/about" },
    { label: "Collections", href: "/collections" },
    { label: "Wishlist", href: "/wishlist" },
  ] },
  { title: "CONNECT", items: [
    { label: "Instagram ↗", href: "https://www.instagram.com/ignyteactive" },
  ] },
];

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return href.startsWith("http") ? <a href={href} target="_blank" rel="noreferrer">{children}</a> : <Link href={href}>{children}</Link>;
}

export default function Footer() {
  const [signupAttempted, setSignupAttempted] = useState(false);
  return <footer className="pdf-footer" id="footer">
    <div className="pdf-footer-signup"><div className="pdf-footer-signup-inner"><div><span className="pdf-footer-eyebrow">SIGN UP ↘</span><h2>Bring the fire to your inbox</h2><p>Training notes, new drops and everything in between.</p></div><div className="pdf-footer-signup-form"><form onSubmit={event => { event.preventDefault(); setSignupAttempted(true); }}><input type="email" required placeholder="YOUR EMAIL..." aria-label="Email address" /><button type="submit" aria-label="Join newsletter">»</button></form><small>{signupAttempted ? "Email signup isn't available yet. Please check back soon." : "Email updates are coming soon."}</small></div></div></div>
    <div className="pdf-footer-perks"><Link href="/shop"><span aria-hidden="true">↗</span><strong>DISCOVER THE<br />COLLECTION</strong></Link><Link href="/wishlist"><span aria-hidden="true">♡</span><strong>SAVE YOUR<br />FAVOURITES</strong></Link><div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 5h12v11H2zM14 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg><strong>FREE SHIPPING<br />OVER $100</strong></div><Link href="/contact"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 13v-1a8 8 0 0 1 16 0v1M4 13h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2ZM20 13h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2ZM17 19c-.5 2-2.3 3-5 3h-2"/></svg><strong>CONTACT US<br />FOR SUPPORT</strong></Link></div>
    <div className="pdf-footer-main"><div className="pdf-footer-brand"><Link href="/" aria-label="Ignyte home"><img src={asset("/images/ignyte-logo.png")} alt="IGNYTE" /></Link><h3>BUILT FOR THE BURN™</h3><p>High-performance activewear<br />for women who bring the fire.</p><a className="pdf-footer-social" href="https://www.instagram.com/ignyteactive" target="_blank" rel="noreferrer" aria-label="Ignyte Instagram"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.5" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg></a></div>{footerLinks.map(group => <div className="pdf-footer-column" key={group.title}><h3>{group.title}</h3>{group.items.map(item => <FooterLink href={item.href} key={item.href}>{item.label}</FooterLink>)}</div>)}</div>
    <div className="pdf-footer-bottom"><span>© 2026 Ignyte Active / All Rights Reserved / Bring The Fire</span><div className="pdf-footer-controls"><div className="footer-currency"><span>DISPLAY CURRENCY</span><CurrencySelector /></div><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link></div></div>
  </footer>;
}
