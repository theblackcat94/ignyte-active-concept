"use client";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";

type Subscriber = { email: string; status: "pending" | "confirmed" | "unsubscribed"; consent_at: string; source: string };
type Page = { subscribers: Subscriber[]; count: number; page: number; pageSize: number };
function csvCell(value: string) { const safe = /^[=+@\-\t\r]/.test(value) ? `'${value}` : value; return `"${safe.replaceAll('"', '""')}"`; }

export default function MarketingPage() {
  const token = useAdminToken();
  const [data, setData] = useState<Page | null>(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { if (!token) return; void fetch(`/api/admin/marketing?page=${page}`, { headers: adminHeaders(token) }).then(async response => { if (!response.ok) throw Error("Could not load subscribers."); return response.json() as Promise<Page>; }).then(setData).catch(error => setMessage(error.message)); }, [token, page]);
  async function unsubscribe(email: string) {
    if (!token || !window.confirm(`Unsubscribe ${email}?`)) return;
    const response = await fetch("/api/admin/marketing", { method: "PATCH", headers: adminHeaders(token), body: JSON.stringify({ email, status: "unsubscribed" }) });
    if (!response.ok) { setMessage("Could not update subscriber."); return; }
    setData(current => current && ({ ...current, subscribers: current.subscribers.map(item => item.email === email ? { ...item, status: "unsubscribed" } : item) }));
    setMessage(`${email} unsubscribed.`);
  }
  function exportVisible() {
    const rows = data?.subscribers.filter(item => item.status === "confirmed") ?? [];
    const csv = ["Email,Consent time,Source", ...rows.map(item => [item.email, item.consent_at, item.source].map(csvCell).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `ignyte-subscribers-page-${page + 1}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  const shown = data?.subscribers.filter(item => item.email.includes(filter.trim().toLowerCase())) ?? [];
  return <AdminPageShell title="Newsletter">{!token && <p>Sign in with a team account.</p>}{message && <p role="status">{message}</p>}{token && <><div className="ops-grid"><div className="ops-card"><span>SUBSCRIBERS</span><strong>{data?.count ?? "—"}</strong><p>All statuses</p></div><div className="ops-card"><span>ACTIVE ON THIS PAGE</span><strong>{data?.subscribers.filter(item => item.status === "confirmed").length ?? "—"}</strong><p>Explicit website opt-ins</p></div></div><div className="ops-panel"><h2>Newsletter subscribers</h2><p>Footer signups with consent are saved in Supabase and can be managed here. AWS SES is the chosen sender for this store. Campaign and welcome email sending will be enabled after the AWS account, verified sending domain, and production sending access are ready. No messages are sent from this panel yet.</p><div className="ops-toolbar"><label>Search this page <input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Email address" /></label><button type="button" onClick={exportVisible} disabled={!data?.subscribers.some(item => item.status === "confirmed")}>EXPORT ACTIVE ON THIS PAGE</button></div><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Email</th><th>Status</th><th>Consent captured</th><th>Source</th><th>Action</th></tr></thead><tbody>{shown.map(item => <tr key={item.email}><td>{item.email}</td><td>{item.status}</td><td>{new Date(item.consent_at).toLocaleString("en-AU")}</td><td>{item.source}</td><td>{item.status === "confirmed" && <button type="button" onClick={() => void unsubscribe(item.email)}>UNSUBSCRIBE</button>}</td></tr>)}</tbody></table></div>{!shown.length && <p>No subscribers on this page.</p>}<div className="ops-toolbar"><button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>PREVIOUS</button><span>Page {page + 1}</span><button type="button" disabled={!data || (page + 1) * data.pageSize >= data.count} onClick={() => setPage(value => value + 1)}>NEXT</button></div></div></>}</AdminPageShell>;
}
