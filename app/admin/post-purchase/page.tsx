"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";

type Step = { step: "fit_care" | "review_request" | "complete_set"; enabled: boolean; delay_days: number; subject: string; preheader: string; body_copy: string };
type Job = { id: string; order_id: string; step: string; customer_email: string; due_at: string; status: string; reason: string | null; sent_at: string | null; provider_message_id: string | null };
type Overview = { settings: { enabled: boolean }; steps: Step[]; jobs: Job[]; deliveryLocked: boolean };
type Design = { subject: string; html: string; text: string };
const names: Record<Step["step"], string> = { fit_care: "01 · How's the Fit?", review_request: "02 · Your IGNYTE Verdict", complete_set: "03 · Meet Its Match" };

export default function PostPurchaseAdmin() {
  const token = useAdminToken();
  const [data, setData] = useState<Overview | null>(null);
  const [drafts, setDrafts] = useState<Step[]>([]);
  const [preview, setPreview] = useState<Design | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    if (!token) return;
    const response = await fetch("/api/admin/post-purchase", { headers: adminHeaders(token), cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Could not load the journey");
    setData(result); setDrafts(result.steps);
  }, [token]);
  useEffect(() => { const timer = setTimeout(() => { void refresh().catch(error => setMessage(error.message)); }, 0); return () => clearTimeout(timer); }, [refresh]);
  async function action(body: object) {
    if (!token || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/post-purchase", { method: "POST", headers: adminHeaders(token), body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed");
      if (result.design) { setPreview(result.design); setMessage("Sample preview only. No customer email was sent."); }
      else { setMessage(result.sentTo ? `Test email sent to ${result.sentTo}.` : "Journey suppressed."); await refresh(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Action failed"); }
    finally { setBusy(false); }
  }
  async function save(body: object) {
    if (!token || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/post-purchase", { method: "PATCH", headers: adminHeaders(token), body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save settings");
      await refresh(); setMessage("Settings saved. Server delivery remains independently locked until launch approval.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Save failed"); }
    finally { setBusy(false); }
  }
  const change = (step: Step["step"], patch: Partial<Step>) => setDrafts(rows => rows.map(row => row.step === step ? { ...row, ...patch } : row));
  const total = (status: string) => data?.jobs.filter(job => job.status === status).length ?? 0;
  return <AdminPageShell title="Post-purchase emails">
    <p>Private development preview. Delivery confirmation from the 3PL is not connected; payment or dispatch never starts this journey. Customer email sending is locked off independently of these controls.</p>
    {message && <p role="status">{message}</p>}
    {!token && <p>Sign in with a team account.</p>}
    {data && <>
      <div className="ops-grid">
        <div className="ops-card"><span>JOURNEY</span><strong>{data.settings.enabled ? "ON" : "OFF"}</strong></div>
        <div className="ops-card"><span>SERVER DELIVERY</span><strong>{data.deliveryLocked ? "LOCKED" : "ENABLED"}</strong></div>
        <div className="ops-card"><span>SCHEDULED</span><strong>{total("scheduled")}</strong></div>
        <div className="ops-card"><span>SENT</span><strong>{total("sent")}</strong></div>
        <div className="ops-card"><span>FAILURES</span><strong>{total("failed")}</strong></div>
      </div>
      <section className="ops-panel"><h2>Journey control</h2><label><input type="checkbox" checked={data.settings.enabled} onChange={event => void save({ kind: "settings", enabled: event.target.checked })} /> Enable queue enrolment after confirmed delivery</label><p>Keep this off until delivery events, consent, bounce suppression, guest review verification and full test sends have been checked.</p></section>
      {drafts.map(row => <section className="ops-panel" key={row.step}><h2>{names[row.step]}</h2><div className="admin-fields">
        <label>ENABLED<input type="checkbox" checked={row.enabled} onChange={event => change(row.step, { enabled: event.target.checked })} /></label>
        <label>DELAY AFTER DELIVERY · DAYS<input type="number" min="1" max="90" value={row.delay_days} onChange={event => change(row.step, { delay_days: Number(event.target.value) })} /></label>
        <label>SUBJECT<input value={row.subject} onChange={event => change(row.step, { subject: event.target.value })} /></label>
        <label>PREHEADER<input value={row.preheader} onChange={event => change(row.step, { preheader: event.target.value })} /></label>
        <label className="wide">OPENING BODY COPY<textarea rows={5} value={row.body_copy.replaceAll("\\n", "\n")} onChange={event => change(row.step, { body_copy: event.target.value })} /></label>
      </div><div className="ops-toolbar"><button disabled={busy} onClick={() => void save({ kind: "step", ...row })}>SAVE EMAIL SETTINGS</button><button disabled={busy} onClick={() => void action({ action: "preview", step: row.step })}>PREVIEW</button><button disabled={busy} onClick={() => void action({ action: "test", step: row.step })}>SEND TEST TO MY STAFF EMAIL</button></div></section>)}
      {preview && <section className="ops-panel"><h2>Sample email preview</h2><p>Subject: {preview.subject}</p><iframe title="Post-purchase sample email" srcDoc={preview.html} sandbox="" style={{ width: "100%", maxWidth: 640, height: 680, border: "1px solid var(--line)" }} /><details><summary>Plain text</summary><pre style={{ whiteSpace: "pre-wrap" }}>{preview.text}</pre></details></section>}
      <section className="ops-panel"><h2>Recent customer journeys</h2><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Order</th><th>Email</th><th>Step</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>{data.jobs.map(job => <tr key={job.id}><td>{job.order_id}</td><td>{job.customer_email}</td><td>{job.step}</td><td>{new Date(job.due_at).toLocaleString("en-AU")}</td><td>{job.status}{job.reason ? ` · ${job.reason}` : ""}</td><td>{job.status === "scheduled" && <button disabled={busy} onClick={() => void action({ action: "suppress", orderId: job.order_id })}>SUPPRESS ORDER</button>}</td></tr>)}</tbody></table></div>{!data.jobs.length && <p>No journeys scheduled.</p>}</section>
    </>}
  </AdminPageShell>;
}
