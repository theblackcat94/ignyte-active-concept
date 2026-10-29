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
    <div className="pdf-footer-main"><div className="pdf-footer-brand"><FooterLink href="/" ariaLabel="Ignyte home"><span className="pdf-footer-logo"><HeaderLogo /></span></FooterLink><h3>BUILT FOR THE BURN™</h3><p>High-performance activewear<br />for women who bring the fire.</p><a className="pdf-footer-social" href="https://www.instagram.com/ignyteactive" target="_blank" rel="noreferrer" aria-label="Ignyte Instagram"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.5" cy="6.6" r="1" fill="currentColor" stroke="none"/></svg></a></div>{footerLinks.map(group => <div className="pdf-footer-column" key={group.title}><h3>{group.title}</h3>{group.items.map(item => <FooterLink href={item.href} key={item.href}>{item.label}</FooterLink>)}</div>)}</div>
    <div className="pdf-footer-bottom"><span>© 2026 Ignyte Active / All Rights Reserved / Bring The Fire<br /><span className="pdf-footer-credit">Branding + Website by <a href="https://justcreative.com/" target="_blank" rel="noreferrer">JUST Creative</a></span></span><div className="pdf-footer-controls"><div className="footer-appearance"><span>APPEARANCE</span><StyledSelect ariaLabel="Appearance" value={appearance} onChange={value => changeAppearance(value as "light" | "dark" | "ignyte")} options={[{ value: "light", label: "Light Mode", icon: "sun" }, { value: "dark", label: "Dark Mode", icon: "moon" }, { value: "ignyte", label: "IGNYTE Mode", icon: "flame" }]} /></div><div className="footer-currency"><span>DISPLAY CURRENCY</span><CurrencySelector /></div><FooterLink href="/privacy">Privacy Policy</FooterLink><FooterLink href="/terms">Terms of Service</FooterLink></div></div>
  </footer>;
}
