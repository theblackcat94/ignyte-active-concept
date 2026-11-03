"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "./store-provider";
import HeartIcon from "./heart-icon";
import AnnouncementBar from "./announcement-bar";
import HeaderLogo from "./header-logo";
import AccountDiscoverDrawer from "./account-discover-drawer";
import WishlistDrawer from "./wishlist-drawer";
import { HelpLinks, PreferenceControls } from "./header-help";
import "@/app/header-saved-items.css";
import "@/app/mobile-navigation.css";

export default function Header() {
  const { products, categories, bag, bagOpen, setBagOpen, searchOpen, setSearchOpen } = useStore();
  const nav = categories.map(category => [category.label.toUpperCase(), category.id === "all" ? "/shop" : `/shop/${category.id}`]);
  const primaryIds = ["all", "sports-bras", "leggings", "shorts", "tops"];
  const primaryNav = primaryIds.map(id => categories.find(category => category.id === id)).filter((category): category is (typeof categories)[number] => Boolean(category));
  const remainingNav = categories.filter(category => !primaryIds.includes(category.id));
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSupportOpen, setMobileSupportOpen] = useState(false);
  const [mobilePreferencesOpen, setMobilePreferencesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const closeAccount = useCallback(() => setAccountOpen(false), []);
  const closeWishlist = useCallback(() => setWishlistOpen(false), []);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const results = query.trim() ? products.filter(p => `${p.name} ${p.color} ${p.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];
  useEffect(() => {
    if (!menuOpen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [menuOpen]);

  useEffect(() => {
    let lastY = Math.max(0, window.scrollY);
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      setHeaderScrolled(y > 8);
      if (window.innerWidth > 1100 || y <= 2 || menuOpen || searchOpen || bagOpen) {
        setHeaderHidden(false);
        lastY = y;
        return;
      }
      const change = y - lastY;
      if (Math.abs(change) >= 5) {
        setHeaderHidden(change > 0 && y > 96);
        lastY = y;
      }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname, menuOpen, searchOpen, bagOpen]);

  return <>
    <AnnouncementBar />
    <header className={`site-header${headerHidden ? " site-header-hidden" : ""}${headerScrolled ? " site-header-scrolled" : ""}`}>
      <div className="header-mobile-left"><button className="header-icon mobile-menu-toggle" aria-label="Open menu" onClick={() => { setMobileSupportOpen(false); setMobilePreferencesOpen(false); setMenuOpen(true); }}><span className="hamburger"><i /><i /></span></button><button className="header-icon mobile-search-trigger" aria-label="Search" onClick={() => setSearchOpen(true)}><Icon name="search" /></button></div>
      <Link className="brand brand-image" href="/" aria-label="Ignyte home"><HeaderLogo /></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{nav.map(([label, href]) => <Link className={pathname === href ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav>
      <div className="header-actions">
        <button className="header-icon header-account-trigger" aria-label="Open account and discovery" aria-expanded={accountOpen} onClick={() => { setBagOpen(false); setWishlistOpen(false); setAccountOpen(true); }}><Icon name="account" /></button>
        <button className="header-icon search-trigger" aria-label="Search" onClick={() => setSearchOpen(true)}><Icon name="search" /></button>
        <button className="header-icon bag-trigger" aria-label={`Bag with ${bag.length} items`} onClick={() => { setWishlistOpen(false); setBagOpen(true); }}><span className="bag-icon-wrap"><Icon name="bag" /><sup>{bag.reduce((sum, item) => sum + item.quantity, 0)}</sup></span></button>
      </div>
    </header>
    {menuOpen && <><div className="drawer-backdrop" onClick={() => setMenuOpen(false)} /><nav className="mobile-menu" aria-label="Mobile navigation"><div className="mobile-menu-head"><HeaderLogo /><button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button></div>
      <div className="mobile-nav-group mobile-nav-primary" aria-label="Shop">{primaryNav.map(category => <Link href={category.id === "all" ? "/shop" : `/shop/${category.id}`} key={category.id} onClick={() => setMenuOpen(false)}>{category.label.toUpperCase()}</Link>)}</div>
      <div className="mobile-nav-group mobile-nav-secondary"><h2>EXPLORE &amp; ACCOUNT_</h2><Link href="/about/" onClick={() => setMenuOpen(false)}>Our Story</Link><Link href="/#best-sellers-title" onClick={() => setMenuOpen(false)}>The IGNYTE Edit</Link>{remainingNav.map(category => <Link href={`/shop/${category.id}`} key={category.id} onClick={() => setMenuOpen(false)}>{category.label}</Link>)}<button type="button" onClick={() => { setMenuOpen(false); setBagOpen(false); setWishlistOpen(true); }}>Saved Items</button><button type="button" onClick={() => { setMenuOpen(false); setWishlistOpen(false); setAccountOpen(true); }}>My Account</button></div>
      <div className="mobile-nav-group mobile-nav-utilities"><h2>HELP &amp; SETTINGS_</h2><button type="button" className="mobile-nav-expand" aria-expanded={mobileSupportOpen} aria-controls="mobile-support-panel" onClick={() => setMobileSupportOpen(value => !value)}>Support, sizing &amp; returns<span aria-hidden="true">{mobileSupportOpen ? "−" : "+"}</span></button>{mobileSupportOpen && <div id="mobile-support-panel" className="mobile-nav-expand-panel"><HelpLinks mobile onNavigate={() => setMenuOpen(false)} /></div>}<button type="button" className="mobile-nav-expand" aria-expanded={mobilePreferencesOpen} aria-controls="mobile-preferences-panel" onClick={() => setMobilePreferencesOpen(value => !value)}>Currency &amp; appearance<span aria-hidden="true">{mobilePreferencesOpen ? "−" : "+"}</span></button>{mobilePreferencesOpen && <div id="mobile-preferences-panel" className="mobile-nav-expand-panel"><PreferenceControls /></div>}</div>
    </nav></>}
    <AccountDiscoverDrawer open={accountOpen} onClose={closeAccount} />
    <WishlistDrawer open={wishlistOpen} onClose={closeWishlist} />
    {searchOpen && <div className="search-overlay" role="dialog" aria-label="Search products"><div className="search-inner"><div className="search-line"><Icon name="search" /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && query.trim()) { router.push(`/shop?q=${encodeURIComponent(query)}`); setSearchOpen(false); } }} placeholder="Search the collection" aria-label="Search the collection" /><button onClick={() => { setSearchOpen(false); setQuery(""); }} aria-label="Close search">×</button></div><div className="search-results">{query.trim() ? results.length ? results.map(p => <Link href={`/product/${p.slug}`} key={p.slug} onClick={() => setSearchOpen(false)}><img src={p.image} alt="" /><span>{p.name}<small>{p.color} · ${p.price}</small></span><b>↗</b></Link>) : <p>No matching pieces found.</p> : <p>TRY “HALTER”, “LEGGINGS” OR “ESPRESSO”</p>}</div></div></div>}
  </>;
}

function Icon({ name }: { name: "search" | "heart" | "bag" | "account" }) {
  if (name === "account") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.5-4.2 3-6.3 7.5-6.3s7 2.1 7.5 6.3"/></svg>;
  if (name === "search") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>;
  if (name === "heart") return <HeartIcon />;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4.5 8.5h15l-1 12h-13l-1-12Z"/><path d="M8.5 9V6a3.5 3.5 0 0 1 7 0v3"/></svg>;
}
