"use client";

import Link from "next/link";
import { useState } from "react";

export default function Footer() {
  const [signupAttempted, setSignupAttempted] = useState(false);
  return <footer className="site-footer" id="footer">
    <div className="footer-top"><div><span className="eyebrow">THE IGNITION POINT</span><h2>BRING THE FIRE<br /><em>EVERYWHERE.</em></h2></div><div className="newsletter"><p>Training notes, new drops and everything in between.</p><form onSubmit={e => { e.preventDefault(); setSignupAttempted(true); }}><input type="email" required placeholder="YOUR EMAIL ADDRESS" aria-label="Email address" /><button type="submit" aria-label="Join newsletter">↗</button></form><small>{signupAttempted ? "This preview cannot collect emails yet." : "Newsletter signup is a concept preview."}</small></div></div>
    <div className="footer-main"><div className="footer-brand"><Link className="brand" href="/"><span className="brand-flame">◢</span><span>IGNYTE</span></Link><p>High-performance activewear for women who bring the fire.</p><a href="https://www.instagram.com/ignyteactive" target="_blank" rel="noreferrer">INSTAGRAM ↗</a></div><div><h3>SHOP</h3><Link href="/shop">Shop all</Link><Link href="/shop/sports-bras">Sports bras</Link><Link href="/shop/tops">Tops</Link><Link href="/shop/leggings">Leggings</Link><Link href="/shop/shorts">Shorts</Link></div><div><h3>EXPLORE</h3><Link href="/#story">Our story</Link><Link href="/#collections">Collections</Link><Link href="/wishlist">Wishlist</Link></div><div><h3>HELP & SUPPORT</h3><a href="https://ignyteactive.com/contact/" target="_blank" rel="noreferrer">Contact</a><a href="https://ignyteactive.com/privacy-policy" target="_blank" rel="noreferrer">Privacy policy</a><a href="https://ignyteactive.com/terms-conditions" target="_blank" rel="noreferrer">Terms of service</a></div></div>
    <div className="footer-bottom"><span>© 2026 IGNYTE ACTIVE</span><span>CONCEPT STOREFRONT · CHECKOUT NOT CONNECTED</span><a href="#top">BACK TO TOP ↑</a></div>
  </footer>;
}
