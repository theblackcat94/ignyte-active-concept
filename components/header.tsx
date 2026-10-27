"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { asset } from "@/lib/asset";
import { useStore } from "./store-provider";
import { CurrencySelector } from "./currency-estimate";

export default function Header() {
  const { products, categories, bag, setBagOpen, searchOpen, setSearchOpen, wishlist } = useStore();
  const nav = categories.map(category => [category.label.toUpperCase(), category.id === "all" ? "/shop" : `/shop/${category.id}`]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const results = query.trim() ? products.filter(p => `${p.name} ${p.color} ${p.category}`.toLowerCase().includes(query.toLowerCase())).slice(0, 5) : [];

  return <>
    <div className="announcement"><span>BUILT FOR THE BURN™</span><span className="announcement-center">MOVE WITH PURPOSE. TRAIN WITH FIRE.</span><span>IGNYTE ACTIVE © 2026</span></div>
    <header className="site-header">
      <button className="header-icon mobile-menu-toggle" aria-label="Open menu" onClick={() => setMenuOpen(true)}><span className="hamburger"><i /><i /></span></button>
      <Link className="brand brand-image" href="/" aria-label="Ignyte home"><img src={asset("/images/ignyte-logo.png")} alt="Ignyte" /></Link>
      <nav className="desktop-nav" aria-label="Main navigation">{nav.map(([label, href]) => <Link className={pathname === href ? "active" : ""} href={href} key={href}>{label}</Link>)}</nav>
      <div className="header-actions">
        <CurrencySelector />
        <Link className="header-icon" href="/account" aria-label="Your account"><Icon name="account" /></Link>
        <button className="header-icon search-trigger" aria-label="Search" onClick={() => setSearchOpen(true)}><Icon name="search" /></button>
        <Link className="header-icon wishlist-trigger" href="/wishlist" aria-label={`Wishlist with ${wishlist.length} items`}><Icon name="heart" />{wishlist.length > 0 && <sup>{wishlist.length}</sup>}</Link>
        <button className="header-icon bag-trigger" aria-label={`Bag with ${bag.length} items`} onClick={() => setBagOpen(true)}><Icon name="bag" /><sup>{bag.reduce((sum, item) => sum + item.quantity, 0)}</sup></button>
      </div>
    </header>
    {menuOpen && <><div className="drawer-backdrop" onClick={() => setMenuOpen(false)} /><div className="mobile-menu"><div className="mobile-menu-head"><img src={asset("/images/ignyte-logo.png")} alt="Ignyte" /><button onClick={() => setMenuOpen(false)} aria-label="Close menu">×</button></div>{nav.map(([label, href]) => <Link href={href} key={href} onClick={() => setMenuOpen(false)}>{label}<span>↗</span></Link>)}<Link href="/account" onClick={() => setMenuOpen(false)}>MY ACCOUNT<span>↗</span></Link><p>BUILT FOR THE BURN™</p></div></>}
    {searchOpen && <div className="search-overlay" role="dialog" aria-label="Search products"><div className="search-inner"><div className="search-line"><Icon name="search" /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && query.trim()) { router.push(`/shop?q=${encodeURIComponent(query)}`); setSearchOpen(false); } }} placeholder="Search the collection" aria-label="Search the collection" /><button onClick={() => { setSearchOpen(false); setQuery(""); }} aria-label="Close search">×</button></div><div className="search-results">{query.trim() ? results.length ? results.map(p => <Link href={`/product/${p.slug}`} key={p.slug} onClick={() => setSearchOpen(false)}><img src={p.image} alt="" /><span>{p.name}<small>{p.color} · ${p.price}</small></span><b>↗</b></Link>) : <p>No matching pieces found.</p> : <p>TRY “HALTER”, “LEGGINGS” OR “ESPRESSO”</p>}</div></div></div>}
  </>;
}

function Icon({ name }: { name: "search" | "heart" | "bag" | "account" }) {
  if (name === "account") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.5-4.2 3-6.3 7.5-6.3s7 2.1 7.5 6.3"/></svg>;
  if (name === "search") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>;
  if (name === "heart") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M20.8 8.4c0 5-8.8 11.1-8.8 11.1S3.2 13.4 3.2 8.4a4.4 4.4 0 0 1 8.8-.4 4.4 4.4 0 0 1 8.8.4Z"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4.5 8.5h15l-1 12h-13l-1-12Z"/><path d="M8.5 9V6a3.5 3.5 0 0 1 7 0v3"/></svg>;
}
