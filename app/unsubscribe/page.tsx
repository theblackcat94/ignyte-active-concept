"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";

function UnsubscribeForm() {
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function unsubscribe() {
    setBusy(true);
    const response = await fetch("/api/newsletter/unsubscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    setMessage(response.ok ? "You have been unsubscribed from IGNYTE marketing emails." : "We could not update your preference. Please contact support@ignyteactive.com.");
    setBusy(false);
  }
  return <div className="section-wrap" style={{ paddingBlock: "90px", minHeight: "50vh" }}><h1>EMAIL PREFERENCES<span style={{ color: "#FF4533" }}>.</span></h1><p>Stop receiving IGNYTE marketing emails.</p>{token ? <button className="button button-orange" type="button" disabled={busy || Boolean(message)} onClick={() => void unsubscribe()}>{busy ? "PLEASE WAIT" : "UNSUBSCRIBE"}</button> : <p>This unsubscribe link is incomplete.</p>}{message && <p role="status">{message}</p>}<p><Link href="/">RETURN TO STORE ↗</Link></p></div>;
}
export default function UnsubscribePage() { return <Suspense fallback={<div className="section-wrap">Loading preferences…</div>}><UnsubscribeForm /></Suspense>; }
