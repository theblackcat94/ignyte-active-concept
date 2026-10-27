"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { browserDb } from "@/lib/commerce";
import AdminToolsNav from "@/components/admin-tools-nav";
import "../admin.css";
import "../operations.css";

type Summary = { counts: Record<string, number>; topPages: [string, number][]; daily: [string, number][]; truncated: boolean };

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void (async () => {
      const { data: { session } } = await browserDb().auth.getSession();
      if (!session) { setMessage("Sign in with a team account to view analytics."); return; }
      const response = await fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!response.ok) { setMessage("Analytics are unavailable for this account."); return; }
      setSummary(await response.json() as Summary);
    })();
  }, []);
  const max = Math.max(1, ...(summary?.daily.map(([, count]) => count) ?? []));
  return <div className="admin-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/admin">ADMIN</Link><span>/</span><span>ANALYTICS</span></div>
    <div className="admin-title"><div><span className="eyebrow">IGNYTE / INTERNAL</span><h1>ANALYTICS<span>.</span></h1></div></div>
    <AdminToolsNav />
    {message && <p role="status">{message}</p>}
    {summary && <><p>Last 30 days. First-party event counts only; no visitor IDs or individual browsing histories are stored.</p>
      <div className="ops-grid">{[
        ["Page views", (summary.counts.page_view ?? 0) + (summary.counts.product_view ?? 0)],
        ["Product views", summary.counts.product_view ?? 0],
        ["Added to bag", summary.counts.add_to_bag ?? 0],
        ["Checkout visits", summary.counts.checkout_started ?? 0],
        ["Order requests", summary.counts.order_requested ?? 0],
      ].map(([label, count]) => <div className="ops-card" key={label}><span>{label}</span><strong>{count}</strong></div>)}</div>
      <div className="ops-panel"><h2>Daily page views</h2>{summary.daily.length ? summary.daily.map(([day, count]) => <div key={day}><div className="ops-row"><span>{day}</span><strong>{count}</strong></div><div className="ops-bar"><span style={{ width: `${count / max * 100}%` }} /></div></div>) : <p>No events yet.</p>}</div>
      <div className="ops-panel"><h2>Top pages</h2>{summary.topPages.map(([path, count]) => <div className="ops-row" key={path}><span>{path}</span><strong>{count}</strong></div>)}{summary.truncated && <p>More than 10,000 events were recorded; this view is capped. Export or aggregate the table for a complete report.</p>}</div></>}
  </div>;
}
