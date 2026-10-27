"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserDb, commerceConfigured } from "@/lib/commerce";
import { useStore } from "@/components/store-provider";
import "./account.css";

type Order = { id: string; status: string; subtotal_cents: number; total_cents: number | null; stripe_session_id: string | null; created_at: string;
  order_items: { product_name: string; size: string; quantity: number }[] };

export default function AccountPage() {
  const router = useRouter();
  const { clearBag } = useStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!commerceConfigured) return;
    const db = browserDb();
    const checkoutSessionId = new URLSearchParams(window.location.search).get("session_id");
    let polling: ReturnType<typeof setInterval> | undefined;
    const refresh = async () => {
      const { data: { user } } = await db.auth.getUser();
      setUserEmail(user?.email ?? null);
      setUserName(typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null);
      if (user) {
        const { data: staff } = await db.from("staff_members").select("role").eq("user_id", user.id).maybeSingle();
        setIsStaff(Boolean(staff));
        const { data } = await db.from("orders")
          .select("id,status,subtotal_cents,total_cents,stripe_session_id,created_at,order_items(product_name,size,quantity)")
          .order("created_at", { ascending: false });
        setOrders((data as Order[]) ?? []);
        if (checkoutSessionId) {
          const checkoutOrder = (data as Order[] | null)?.find(order => order.stripe_session_id === checkoutSessionId);
          if (checkoutOrder?.status === "paid") {
            clearBag();
            setMessage("Payment confirmed. Thank you for your order.");
            if (polling) clearInterval(polling);
          } else setMessage("Your payment is being confirmed. Order history will update shortly.");
        }
      } else { setOrders([]); setIsStaff(false); }
    };
    void refresh();
    let attempts = 0;
    if (checkoutSessionId) polling = setInterval(() => {
      if (++attempts > 15) { if (polling) clearInterval(polling); setMessage("Payment confirmation is taking longer than expected. Check your order history shortly."); return; }
      void refresh();
    }, 2000);
    const { data: subscription } = db.auth.onAuthStateChange(() => { setTimeout(() => { void refresh(); }, 0); });
    return () => { subscription.subscription.unsubscribe(); if (polling) clearInterval(polling); };
  }, [clearBag]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const db = browserDb();
    const { error } = mode === "sign-in"
      ? await db.auth.signInWithPassword({ email, password })
      : await db.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/account` } });
    setBusy(false);
    setPassword("");
    setMessage(error ? error.message : mode === "sign-up" ? "Check your email to confirm your account." : "Signed in.");
    if (!error && mode === "sign-in" && new URLSearchParams(window.location.search).get("next") === "checkout") router.push("/checkout");
  }

  if (!commerceConfigured) return <div className="account-page section-wrap"><h1>YOUR ACCOUNT</h1><p>Account sign in is being set up for the new store. Please check back shortly.</p></div>;
  return <div className="account-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>ACCOUNT</span></div>
    <div className="account-heading"><span className="eyebrow">IGNYTE / YOUR SPACE</span><h1>YOUR ACCOUNT<span>.</span></h1><p>Everything you need for your next move.</p></div>
    {userEmail ? <div className="account-dashboard"><aside className="account-sidebar"><div className="account-member"><span className="account-avatar">{(userName || userEmail).slice(0, 1).toUpperCase()}</span><div><span className="eyebrow">SIGNED IN</span><strong>{userName || "Ignyte member"}</strong><small>{userEmail}</small></div></div><nav aria-label="Account navigation"><a href="#orders">ORDER HISTORY <span>↗</span></a><Link href="/wishlist">WISHLIST <span>↗</span></Link>{isStaff && <><Link href="/admin">PRODUCT MANAGER <span>↗</span></Link><Link href="/admin/categories">CATEGORIES <span>↗</span></Link><Link href="/admin/orders">TEAM ORDERS <span>↗</span></Link></>}</nav><button className="account-signout" onClick={async () => { await browserDb().auth.signOut(); }}>SIGN OUT ↗</button></aside>
      <div className="account-main"><div className="account-welcome"><span className="eyebrow">READY FOR WHAT&apos;S NEXT</span><h2>Hi{userName ? `, ${userName.split(" ")[0]}` : ""}<em>.</em></h2><p>Track your orders, revisit your favourites, and find the pieces that move with you.</p><Link href="/shop" className="button button-orange">SHOP THE COLLECTION ↗</Link></div><section id="orders" className="account-order-section"><div className="account-section-head"><div><span className="eyebrow">YOUR ACTIVITY</span><h2>ORDER HISTORY</h2></div><span>{orders.length} {orders.length === 1 ? "ORDER" : "ORDERS"}</span></div>{orders.length ? <div className="account-orders">{orders.map(order => <article key={order.id}><div><strong>{new Date(order.created_at).toLocaleDateString("en-AU")}</strong><span>{order.status === "awaiting_payment" ? "AWAITING PAYMENT" : order.status.toUpperCase()} · ${((order.total_cents ?? order.subtotal_cents) / 100).toFixed(2)}</span></div><ul>{order.order_items.map((item, index) => <li key={index}>{item.product_name} / {item.size} × {item.quantity}</li>)}</ul>{order.status === "awaiting_payment" && <p>Shipping and payment details will be confirmed before fulfillment.</p>}</article>)}</div> : <div className="account-order-empty"><span>01 / THE START</span><h3>Your story starts here.</h3><p>Your orders will appear here once you check out.</p><Link className="text-link" href="/shop">EXPLORE THE COLLECTION ↗</Link></div>}</section></div></div> : <><div className="account-tabs"><button className={mode === "sign-in" ? "active" : ""} onClick={() => setMode("sign-in")}>SIGN IN</button><button className={mode === "sign-up" ? "active" : ""} onClick={() => setMode("sign-up")}>CREATE ACCOUNT</button></div>
      <form className="account-form" onSubmit={submit}><label>EMAIL<input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label><label>PASSWORD<input type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label><button className="button button-orange" disabled={busy}>{busy ? "PLEASE WAIT" : mode === "sign-in" ? "SIGN IN" : "CREATE ACCOUNT"}</button></form>{mode === "sign-in" && <button className="text-button" onClick={async () => { if (!email) { setMessage("Enter your email first."); return; } const { error } = await browserDb().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/account/reset` }); setMessage(error ? error.message : "Check your email for a password reset link."); }}>FORGOT PASSWORD?</button>}{message && <p role="status">{message}</p>}</>}
  </div>;
}
