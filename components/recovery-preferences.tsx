"use client";
import { useEffect, useState } from "react";
import { browserDb } from "@/lib/commerce";

export default function RecoveryPreferences() {
  const [eligible, setEligible] = useState(false);
  const [available, setAvailable] = useState(false);
  const [optedIn, setOptedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    void browserDb().auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const response = await fetch("/api/recovery/consent", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
      if (!response.ok) return;
      const result = await response.json();
      if (!cancelled) { setAvailable(true); setEligible(result.eligible); setOptedIn(result.optedIn); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  async function update(next: boolean) {
    setBusy(true); setMessage("");
    try {
      const { data } = await browserDb().auth.getSession();
      if (!data.session) throw Error("Sign in required.");
      const response = await fetch("/api/recovery/consent", { method: next ? "POST" : "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: next ? JSON.stringify({ consent: true }) : undefined });
      if (!response.ok) throw Error("Your preference could not be saved.");
      setOptedIn(next); setMessage(next ? "Product reminder preference saved." : "Product reminders turned off.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  if (loading || !available) return null;
  return <section className="account-recovery-pref" aria-label="Product reminder emails"><h2>EMAIL PREFERENCES</h2><p>Optional reminders about items left in your bag or products you explored. No discounts or pressure. You can turn these off at any time.</p>{eligible ? <label><input type="checkbox" checked={optedIn} disabled={busy} onChange={event => void update(event.target.checked)} /> Send me personalised IGNYTE bag and product reminders.</label> : <p>Join the IGNYTE email list first to enable reminders.</p>}{message && <p role="status">{message}</p>}</section>;
}
