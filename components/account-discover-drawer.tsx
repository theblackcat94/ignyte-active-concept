"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import { publicPlacement, type CuratedCollection } from "@/lib/collections";
import { useStore } from "@/components/store-provider";
import { money } from "@/lib/catalog";
import { inStock } from "@/lib/product-merchandising";
import "@/app/account-drawer.css";

export default function AccountDiscoverDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { products, categories, bagOpen, setBagOpen } = useStore();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(commerceConfigured);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<"email" | "sign-in" | "create">("email");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [edit, setEdit] = useState<CuratedCollection | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!commerceConfigured) return;
    const db = browserDb();
    const refresh = async () => { setUser((await db.auth.getUser()).data.user); setAuthLoading(false); };
    void refresh();
    const { data } = db.auth.onAuthStateChange(() => { setTimeout(() => void refresh(), 0); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement;
    setBagOpen(false);
    queueMicrotask(() => {
      try { setRecentSlugs(JSON.parse(sessionStorage.getItem("ignyte-recently-viewed") || "[]") as string[]); } catch { setRecentSlugs([]); }
    });
    void publicPlacement("home-ignyte-edit").then(setEdit).catch(() => setEdit(null));
    const timer = window.setTimeout(() => closeRef.current?.focus(), 30);
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = [...drawerRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled])')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { window.clearTimeout(timer); document.removeEventListener("keydown", keydown); triggerRef.current?.focus(); };
  }, [open, onClose, setBagOpen]);
  useEffect(() => { if (bagOpen && open) onClose(); }, [bagOpen, open, onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (step === "email") { setStep("sign-in"); setMessage(""); return; }
    setBusy(true); setMessage("");
    const db = browserDb();
    const normalized = email.trim().toLowerCase();
    const result = step === "sign-in"
      ? await db.auth.signInWithPassword({ email: normalized, password })
      : await db.auth.signUp({ email: normalized, password, options: { emailRedirectTo: `${window.location.origin}/account`, data: { full_name: name.trim() } } });
    setPassword(""); setBusy(false);
    if (result.error) { setMessage(step === "sign-in" ? "We couldn't sign you in. Check your details or create an account." : result.error.message); return; }
    if (consent) {
      const newsletter = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: normalized, consent: true, website: "" }) });
      if (!newsletter.ok) setMessage("Account step completed, but newsletter signup could not be saved. Please try it in the footer.");
    }
    if (step === "create" && !result.data.session) setMessage("Check your email to confirm your account.");
    else { setMessage("Welcome to IGNYTE."); setStep("email"); }
  }
  async function resetPassword() {
    if (!email.trim()) return;
    setBusy(true);
    await browserDb().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/account/reset` });
    setBusy(false); setMessage("If this address has an account, a reset link is on its way.");
  }
  const recentlyViewed = recentSlugs.map(slug => products.find(product => product.slug === slug)).filter((product): product is (typeof products)[number] => Boolean(product && inStock(product))).slice(0, 6);
  const editProducts = edit ? (edit.mode === "automatic" ? products.filter(item => item.category === edit.rules.category && inStock(item)) : edit.product_slugs.map(slug => products.find(item => item.slug === slug)).filter((product): product is (typeof products)[number] => Boolean(product && inStock(product)))).slice(0, 6) : [];
  const compactProducts = (items: typeof products) => <div className="account-discover-products">{items.map(product => <Link key={product.slug} href={`/product/${product.slug}`} onClick={onClose}><img src={product.image} alt="" /><strong>{product.name}</strong><span>{money(product.price)}</span></Link>)}</div>;
  return <>{open && <div className="drawer-backdrop" onClick={onClose} />}
    <aside ref={drawerRef} className={`bag-drawer account-discover-drawer${open ? " is-open" : ""}`} role="dialog" aria-modal={open} aria-label="Your IGNYTE account and discovery" aria-hidden={!open} inert={!open}>
      <div className="drawer-head"><div><span className="eyebrow">IGNYTE / YOUR SPACE</span><h2>YOUR IGNYTE_</h2></div><button ref={closeRef} type="button" className="icon-button" onClick={onClose} aria-label="Close account drawer">×</button></div>
      <div className="account-discover-scroll">{authLoading ? <section className="account-discover-auth"><p role="status">Checking your account…</p></section> : user ? <section className="account-discover-auth"><h3>HEY, {(String(user.user_metadata?.full_name || user.email || "YOU").split(" ")[0]).toUpperCase()}_</h3><p>Welcome back to IGNYTE.</p><nav><Link href="/account" onClick={onClose}>MY ACCOUNT ↗</Link><Link href="/account#orders" onClick={onClose}>MY ORDERS ↗</Link><Link href="/wishlist" onClick={onClose}>SAVED ITEMS ↗</Link><Link href="/account/reset" onClick={onClose}>ACCOUNT SETTINGS ↗</Link></nav><button type="button" className="account-discover-text" onClick={() => void browserDb().auth.signOut()}>SIGN OUT ↗</button></section> : <section className="account-discover-auth"><h3>LET&apos;S GET MOVING_</h3><p>Sign in or create an account to get started.</p><form onSubmit={submit}><label>EMAIL ADDRESS<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>{step !== "email" && <><button type="button" className="account-discover-text" onClick={() => { setStep("email"); setPassword(""); }}>EDIT EMAIL ↗</button>{step === "create" && <label>NAME<input autoComplete="name" required value={name} onChange={event => setName(event.target.value)} /></label>}<label>PASSWORD<input type="password" autoComplete={step === "create" ? "new-password" : "current-password"} minLength={6} required value={password} onChange={event => setPassword(event.target.value)} /></label></>}{step === "email" && <label className="account-discover-consent"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>Send me IGNYTE news, new drops and exclusive offers.</span></label>}<button type="submit" className="button button-orange" disabled={busy}>{busy ? "PLEASE WAIT…" : step === "email" ? "CONTINUE ↗" : step === "sign-in" ? "SIGN IN ↗" : "CREATE ACCOUNT ↗"}</button></form>{step === "sign-in" && <div className="account-discover-options"><button type="button" onClick={() => { setStep("create"); setMessage(""); }}>CREATE ACCOUNT ↗</button><button type="button" onClick={() => void resetPassword()}>FORGOT PASSWORD?</button></div>}{step === "create" && <><button type="button" className="account-discover-text" onClick={() => setStep("sign-in")}>ALREADY HAVE AN ACCOUNT? SIGN IN ↗</button><p className="account-discover-terms">By creating an account, you agree to our <Link href="/terms" onClick={onClose}>Terms</Link> and <Link href="/privacy" onClick={onClose}>Privacy Policy</Link>.</p></>}{message && <p role="status" className="account-discover-message">{message}</p>}<div className="account-discover-signedout-links"><Link href="/account#orders" onClick={onClose}>MY ORDERS ↗</Link><Link href="/wishlist" onClick={onClose}>SAVED ITEMS ↗</Link></div></section>}
        <section><h3>EXPLORE IGNYTE_</h3><nav className="account-discover-categories">{categories.filter(category => category.id !== "all").map(category => <Link key={category.id} href={`/shop/${category.id}`} onClick={onClose}>{category.label}<span>↗</span></Link>)}</nav></section>
        {recentlyViewed.length > 0 && <section><h3>RECENTLY VIEWED_</h3>{compactProducts(recentlyViewed)}</section>}
        {edit && <section><h3>{edit.name.toUpperCase()}_</h3><p>{edit.description}</p>{editProducts.length > 0 && compactProducts(editProducts)}<Link className="account-discover-edit-link" href={`/collections/${edit.slug}`} onClick={onClose}>VIEW THE EDIT ↗</Link></section>}
      </div></aside></>;
}
