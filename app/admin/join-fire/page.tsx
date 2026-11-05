"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";
import type { JoinFireSettings } from "@/lib/join-fire-settings";
import "../operations.css";

export default function JoinFireAdminPage() {
  const token = useAdminToken();
  const [settings, setSettings] = useState<JoinFireSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!token) return;
    void fetch("/api/admin/join-fire", { headers: adminHeaders(token), cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error("Admin access required."); return response.json() as Promise<JoinFireSettings>; })
      .then(setSettings).catch(error => setMessage(error.message));
  }, [token]);
  function change<K extends keyof JoinFireSettings>(key: K, value: JoinFireSettings[K]) {
    setSettings(current => current ? { ...current, [key]: value } : null);
  }
  async function save() {
    if (!token || !settings) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/join-fire", { method: "PUT", headers: adminHeaders(token), body: JSON.stringify(settings) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save campaign.");
      setSettings(result); setMessage("Campaign saved. Changes appear in the private preview.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save campaign."); }
    finally { setBusy(false); }
  }
  return <AdminPageShell title="JOIN THE FIRE campaign">
    {!token && <p>Sign in with an admin account to manage this campaign.</p>}
    {message && <p role="status" className="admin-message">{message}</p>}
    {settings && <div className="ops-panel">
      <h2>Private campaign draft</h2>
      <p>The page and offer are off by default. Activation is additionally locked at server level until Marcus approves the offer and eligibility terms.</p>
      <div className="ops-panel">
        <h3>Review the flow</h3>
        <p><strong>1.</strong> Open the staff preview to review the landing page and disabled signup form.</p>
        <p><strong>2.</strong> Open the confirmation preview to see the state shown after a successful subscription. This is a visual simulation; it does not save an email or issue a code.</p>
        <p><strong>3.</strong> Open the welcome email preview to review its subject, layout, code placement, offer terms and unsubscribe link. It does not send an email.</p>
        <p>When approved later: a new subscriber submits consent → receives one unique code by email → checkout checks that code against the subscriber email and prior paid orders. Standard footer signups use their existing email and receive no campaign code.</p>
        <div className="ops-toolbar"><Link href="/join-the-fire/" target="_blank">LANDING PAGE ↗</Link><Link href="/join-the-fire/?preview=success" target="_blank">SUCCESS STATE ↗</Link><Link href="/admin/join-fire/email-preview/">WELCOME EMAIL ↗</Link></div>
      </div>
      <div className="admin-fields">
        <label className="admin-check">PUBLIC PAGE<input type="checkbox" checked={settings.publicEnabled} onChange={event => change("publicEnabled", event.target.checked)} /></label>
        <label className="admin-check">ISSUE WELCOME CODES<input type="checkbox" checked={settings.offerEnabled} onChange={event => change("offerEnabled", event.target.checked)} /></label>
        <label>OFFER PERCENT<input type="number" min="1" max="50" value={settings.offerPercent} onChange={event => change("offerPercent", Number(event.target.value))} /></label>
        <label className="wide">OFFER TERMS<textarea rows={3} value={settings.offerTerms} onChange={event => change("offerTerms", event.target.value)} /></label>
        <label>EYEBROW<input value={settings.eyebrow} onChange={event => change("eyebrow", event.target.value)} /></label>
        <label className="wide">HEADLINE<input value={settings.headline} onChange={event => change("headline", event.target.value)} /></label>
        <label className="wide">INTRODUCTION<input value={settings.introduction} onChange={event => change("introduction", event.target.value)} /></label>
        <label className="wide">SUPPORTING COPY<textarea rows={3} value={settings.supportingCopy} onChange={event => change("supportingCopy", event.target.value)} /></label>
        <label className="wide">HERO IMAGE PATH<input value={settings.heroImage} onChange={event => change("heroImage", event.target.value)} /></label>
        <label>CTA<input value={settings.cta} onChange={event => change("cta", event.target.value)} /></label>
        <label className="wide">SUCCESS HEADLINE<input value={settings.confirmationHeadline} onChange={event => change("confirmationHeadline", event.target.value)} /></label>
        <label className="wide">SUCCESS COPY<input value={settings.confirmationCopy} onChange={event => change("confirmationCopy", event.target.value)} /></label>
        <label>EMAIL CAMPAIGN<input readOnly value={settings.emailCampaign} /></label>
        <label className="wide">SEO TITLE<input value={settings.seoTitle} onChange={event => change("seoTitle", event.target.value)} /></label>
        <label className="wide">META DESCRIPTION<input value={settings.seoDescription} onChange={event => change("seoDescription", event.target.value)} /></label>
        <label className="wide">SOCIAL IMAGE PATH<input value={settings.socialImage} onChange={event => change("socialImage", event.target.value)} /></label>
      </div>
      <div className="ops-toolbar"><button type="button" disabled={busy} onClick={() => void save()}>{busy ? "SAVING…" : "SAVE CAMPAIGN"}</button></div>
    </div>}
  </AdminPageShell>;
}
