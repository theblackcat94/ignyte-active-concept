"use client";

import Link from "next/link";
import { useState } from "react";
import { asset } from "@/lib/asset";

const footerLinks = [
  { title: "HELP & SUPPORT", items: [
    { label: "Support & FAQ", href: "/support" },
    { label: "Contact", href: "/contact" },
    { label: "Size guide", href: "/size-guide" },
    { label: "Returns policy", href: "/returns" },
    { label: "Privacy policy", href: "/privacy" },
    { label: "Terms of service", href: "/terms" },
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
    <div className="pdf-footer-signup"><div className="pdf-footer-signup-inner"><div><span className="pdf-footer-eyebrow">SIGN UP ↘</span><h2>Bring the fire to your inbox</h2><p>Training notes, new drops and everything in between.</p></div><div className="pdf-footer-signup-form"><form onSubmit={event => { event.preventDefault(); setSignupAttempted(true); }}><input type="email" required placeholder="YOUR EMAIL..." aria-label="Email address" /><button type="submit" aria-label="Join newsletter">»</button></form><small>{signupAttempted ? "This preview cannot collect emails yet." : "Newsletter signup is a concept preview."}</small></div></div></div>
    <div className="pdf-footer-perks"><Link href="/shop"><span aria-hidden="true">↗</span><strong>DISCOVER THE<br />COLLECTION</strong></Link><Link href="/wishlist"><span aria-hidden="true">♡</span><strong>SAVE YOUR<br />FAVOURITES</strong></Link><Link href="/contact"><span aria-hidden="true">✉</span><strong>NEED HELP?<br />CONTACT US</strong></Link><div><span aria-hidden="true">✓</span><strong>CONCEPT SHOP<br />PREVIEW</strong></div></div>
    <div className="pdf-footer-main"><div className="pdf-footer-brand"><Link href="/" aria-label="Ignyte home"><img src={asset("/images/ignyte-logo.png")} alt="IGNYTE" /></Link><h3>BUILT FOR THE BURN™</h3><p>High-performance activewear<br />for women who bring the fire.</p><a className="pdf-footer-social" href="https://www.instagram.com/ignyteactive" target="_blank" rel="noreferrer" aria-label="Ignyte Instagram"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.5" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg></a></div>{footerLinks.map(group => <div className="pdf-footer-column" key={group.title}><h3>{group.title}</h3>{group.items.map(item => <FooterLink href={item.href} key={item.href}>{item.label}</FooterLink>)}</div>)}</div>
    <div className="pdf-footer-bottom"><span>© 2026 Ignyte Active / All Rights Reserved / Bring The Fire</span><div><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link></div></div>
  </footer>;
}
