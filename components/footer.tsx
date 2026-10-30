"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CurrencySelector } from "./currency-estimate";
import HeartIcon from "./heart-icon";
import HeaderLogo from "./header-logo";
import StyledSelect from "./styled-select";

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
  { title: "CONTACT", items: [
    { label: "Contact us", href: "/contact" },
    { label: "Instagram ↗", href: "https://www.instagram.com/ignyteactive" },
  ] },
];

function FooterLink({ href, children, ariaLabel }: { href: string; children: React.ReactNode; ariaLabel?: string }) {
  const pathname = usePathname();
  return href.startsWith("http") ? <a href={href} target="_blank" rel="noreferrer" aria-label={ariaLabel}>{children}</a> : <Link href={href} aria-label={ariaLabel} onClick={event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (pathname.replace(/\/$/, "") === href.replace(/\/$/, "")) window.scrollTo({ top: 0, behavior: "instant" });
  }}>{children}</Link>;
}

export default function Footer() {
  const comparison = usePathname().replace(/\/$/, "") === "/home-preview";
  const [appearance, setAppearance] = useState<"light" | "dark" | "ignyte">("light");
  useEffect(() => {
    const saved = localStorage.getItem("ignyte-appearance");
    const next = saved === "dark" || saved === "ignyte" ? saved : "light";
    setAppearance(next);
    document.documentElement.dataset.appearance = next;
  }, []);
  function changeAppearance(next: "light" | "dark" | "ignyte") {
    setAppearance(next);
    localStorage.setItem("ignyte-appearance", next);
    document.documentElement.dataset.appearance = next;
  }
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [signupBusy, setSignupBusy] = useState(false);
  const [signupMessage, setSignupMessage] = useState("");
  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupBusy(true);
    setSignupMessage("");
    try {
      const response = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, consent, website: "" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Signup failed. Please try again.");
      setSignupMessage("Thanks for signing up. You're on the list.");
      setEmail("");
      setConsent(false);
    } catch (error) {
      setSignupMessage(error instanceof Error ? error.message : "Signup failed. Please try again.");
    } finally {
      setSignupBusy(false);
    }
  }
  return <footer className="pdf-footer" id="footer">
    <div className="pdf-footer-signup"><div className="pdf-footer-signup-inner"><div><span className="pdf-footer-eyebrow">SIGN UP ↘</span><h2>{comparison ? "First in. Ready for what’s next." : <>Bring the <span className="fx-ember">fire</span> to your inbox</>}</h2><p>{comparison ? "New releases, training notes and a closer look at IGNYTE." : "Training notes, new drops and everything in between."}</p></div><div className="pdf-footer-signup-form"><form onSubmit={subscribe}><div className="pdf-footer-email-row"><input type="email" required placeholder="YOUR EMAIL..." aria-label="Email address" value={email} onChange={event => setEmail(event.target.value)} /><button type="submit" disabled={signupBusy} aria-label="Join newsletter">»</button></div><label className="pdf-footer-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required /><span>I agree to receive IGNYTE emails. I can unsubscribe at any time. See the <FooterLink href="/privacy">Privacy Policy</FooterLink>.</span></label></form><small role="status">{signupMessage}</small></div></div></div>
    <div className="pdf-footer-perks"><FooterLink href="/shop"><span aria-hidden="true">↗</span><strong>DISCOVER THE<br />COLLECTION</strong></FooterLink><FooterLink href="/wishlist"><HeartIcon /><strong>SAVE YOUR<br />FAVOURITES</strong></FooterLink><FooterLink href="/returns"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 5h12v11H2zM14 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg><strong>FREE SHIPPING<br />AU$100 OR MORE</strong></FooterLink><FooterLink href="/contact"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 13v-1a8 8 0 0 1 16 0v1M4 13h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2ZM20 13h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2ZM17 19c-.5 2-2.3 3-5 3h-2"/></svg><strong>CONTACT US<br />FOR SUPPORT</strong></FooterLink></div>
    <div className="pdf-footer-main"><div className="pdf-footer-brand"><FooterLink href="/" ariaLabel="Ignyte home"><span className="pdf-footer-logo"><HeaderLogo /></span></FooterLink><h3>BUILT FOR THE BURN™</h3><p>High-performance activewear<br />for women who bring the fire.</p><div className="pdf-footer-socials"><a className="pdf-footer-social" href="https://www.instagram.com/ignyteactive" target="_blank" rel="noopener noreferrer" aria-label="Ignyte Instagram"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.5" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg></a><a className="pdf-footer-social" href="https://www.tiktok.com/@ignyte.active" target="_blank" rel="noopener noreferrer" aria-label="IGNYTE Active on TikTok"><svg viewBox="0 0 24 24" width="21" height="21" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a></div></div>{footerLinks.map(group => <div className="pdf-footer-column" key={group.title}><h3>{group.title}</h3>{group.items.map(item => <FooterLink href={item.href} key={item.href}>{item.label}</FooterLink>)}</div>)}</div>
    <div className="pdf-footer-bottom"><span>© 2026 Ignyte Active / All Rights Reserved / Bring The Fire<br /><span className="pdf-footer-credit">Branding + Website by <a href="https://justcreative.com/" target="_blank" rel="noreferrer">JUST Creative</a></span></span><div className="pdf-footer-controls"><div className="footer-appearance"><span>APPEARANCE</span><StyledSelect ariaLabel="Appearance" value={appearance} onChange={value => changeAppearance(value as "light" | "dark" | "ignyte")} options={[{ value: "light", label: "Light Mode", icon: "sun" }, { value: "dark", label: "Dark Mode", icon: "moon" }, { value: "ignyte", label: "IGNYTE Mode", icon: "flame" }]} /></div><div className="footer-currency"><span>DISPLAY CURRENCY</span><CurrencySelector /></div><FooterLink href="/privacy">Privacy Policy</FooterLink><FooterLink href="/terms">Terms of Service</FooterLink></div></div>
  </footer>;
}
