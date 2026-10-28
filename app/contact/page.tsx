"use client";
import { useState } from "react";
import Link from "next/link";
import "../support/support.css";
export default function ContactPage() {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try { const response = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); const result = await response.json(); if (!response.ok) throw Error(result.error); setDone(true); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not send message"); }
    finally { setBusy(false); }
  }
  return <main className="support-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/support">SUPPORT</Link><span>/</span><span>CONTACT</span></div><span className="eyebrow">WE ARE HERE TO HELP</span><h1>CONTACT<span>.</span></h1>
    {done ? <div className="support-card"><h2>Message received</h2><p>Your message has been saved for the Ignyte team. We will reply to the email address you provided.</p></div> : <form className="support-form" onSubmit={submit}><p>Ask about an order, a product or delivery. We’ll reply to the email address you provide. You can also email <a href="mailto:support@ignyteactive.com">support@ignyteactive.com</a> directly.</p><label>NAME<input name="name" required minLength={2} maxLength={120} /></label><label>EMAIL<input name="email" type="email" required /></label><label>ORDER NUMBER (OPTIONAL)<input name="orderNumber" maxLength={100} /></label><label>MESSAGE<textarea name="message" required minLength={10} maxLength={4000} rows={7} /></label><input className="support-honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" /><button className="button button-orange" disabled={busy}>{busy ? "SENDING…" : "SEND MESSAGE ↗"}</button>{message && <p role="alert">{message}</p>}</form>}
    </main>;
}
