"use client";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";
import { cartRecoveryEmail } from "@/lib/email-templates";

type Settings = { cart_enabled: boolean; browse_enabled: boolean; onsite_enabled: boolean };
type Activity = { id: string; email: string; kind: string; last_active_at: string; first_sent_at: string | null; second_sent_at: string | null; suppressed_at: string | null; suppression_reason: string | null };
type Delivery = { id: string; stage: string; status: string; restored_at: string | null };
type Dashboard = { settings: Settings; activity: Activity[]; delivery: Delivery[]; deliveryLocked: boolean; browseCopyApproved: boolean };
const siteUrl = "https://dev.ignyteactive.com";
const sample = [{ name: "Aura Halter", color: "Aurora", size: "M", quantity: 1, image: "/images/jacob-2026-10/ign-halt-jac/ign-halt-jac-aura-halter-top-aurora-main-01.jpg", slug: "aura-halter-aurora", priceCents: 6000 }];

export default function RecoveryAdminPage() {
  const token = useAdminToken();
  const [data, setData] = useState<Dashboard | null>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<1 | 2>(1);
  const design = cartRecoveryEmail(preview, sample, `${siteUrl}/recover-bag/?token=PREVIEW-ONLY`, siteUrl, `${siteUrl}/unsubscribe/?token=PREVIEW-ONLY`);
  useEffect(() => { if (!token) return; void fetch("/api/admin/recovery", { headers: adminHeaders(token), cache: "no-store" }).then(async response => { if (!response.ok) throw Error("Recovery data is unavailable. The migration may still be pending."); return response.json() as Promise<Dashboard>; }).then(setData).catch(error => setMessage(error.message)); }, [token]);
  async function save(settings: Settings) {
    if (!token) return;
    const response = await fetch("/api/admin/recovery", { method: "PATCH", headers: adminHeaders(token), body: JSON.stringify(settings) });
    if (!response.ok) { setMessage("Could not save recovery settings."); return; }
    setData(current => current && ({ ...current, settings })); setMessage("Recovery capture settings saved. Customer email delivery has a separate server lock.");
  }
  async function dryRun() {
    if (!token) return;
    const response = await fetch("/api/admin/recovery", { method: "POST", headers: adminHeaders(token), body: JSON.stringify({ action: "dry_run" }) });
    const result = await response.json();
    setMessage(response.ok ? `Dry run: ${result.dueCart} cart and ${result.dueBrowse} browse candidates. No emails sent.` : "Dry run could not complete.");
  }
  return <AdminPageShell title="Customer recovery"><p>Cart and browse recovery are separate. Only signed-in customers with an active subscription and explicit reminder wording can be captured. Customer email delivery is locked off on development. Browse email copy is still awaiting approval, so browse reminders have no send path.</p>{message && <p role="status">{message}</p>}{!token && <p>Sign in with a team account to view recovery activity.</p>}{data && <><div className="ops-grid"><div className="ops-card"><span>RECENT ACTIVITY</span><strong>{data.activity.length}</strong></div><div className="ops-card"><span>CART EMAILS SENT</span><strong>{data.delivery.filter(item => item.status === "sent").length}</strong></div><div className="ops-card"><span>BAGS RESTORED</span><strong>{data.delivery.filter(item => item.restored_at).length}</strong></div><div className="ops-card"><span>SUPPRESSED</span><strong>{data.activity.filter(item => item.suppressed_at).length}</strong></div></div><section className="ops-panel"><h2>Capture controls</h2><p>These controls govern collection and the on-site prompt. Email sending additionally requires a server environment switch and a secret-protected scheduler. Current delivery: <strong>{data.deliveryLocked ? "OFF" : "ENABLED"}</strong>.</p>{(["cart_enabled", "browse_enabled", "onsite_enabled"] as const).map(key => <label key={key} style={{ display: "block", marginBlock: 12 }}><input type="checkbox" checked={data.settings[key]} onChange={event => void save({ ...data.settings, [key]: event.target.checked })} /> {key.replaceAll("_", " ").toUpperCase()}</label>)}<button type="button" onClick={() => void dryRun()}>RUN DRY-RUN CHECK</button></section><section className="ops-panel"><h2>Cart email previews</h2><p>Sample content only. The links below are placeholders; opening a preview never sends an email.</p><div className="ops-toolbar"><button type="button" onClick={() => setPreview(1)} aria-pressed={preview === 1}>3-HOUR REMINDER</button><button type="button" onClick={() => setPreview(2)} aria-pressed={preview === 2}>24-HOUR REMINDER</button></div><p><strong>Subject:</strong> {design.subject}</p><iframe title="Cart recovery email preview" srcDoc={design.html} sandbox="" style={{ width: "100%", maxWidth: 640, height: 680, border: "1px solid #ccc" }} /><details><summary>Plain text version</summary><pre style={{ whiteSpace: "pre-wrap" }}>{design.text}</pre></details></section><section className="ops-panel"><h2>Recent recovery activity</h2><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Customer</th><th>Flow</th><th>Last activity</th><th>First sent</th><th>Second sent</th><th>Status</th></tr></thead><tbody>{data.activity.map(item => <tr key={item.id}><td>{item.email}</td><td>{item.kind}</td><td>{new Date(item.last_active_at).toLocaleString("en-AU")}</td><td>{item.first_sent_at ? new Date(item.first_sent_at).toLocaleString("en-AU") : "—"}</td><td>{item.second_sent_at ? new Date(item.second_sent_at).toLocaleString("en-AU") : "—"}</td><td>{item.suppression_reason ?? "Pending"}</td></tr>)}</tbody></table></div>{!data.activity.length && <p>No captured recovery activity yet.</p>}</section></>}</AdminPageShell>;
}
