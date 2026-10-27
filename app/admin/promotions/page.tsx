"use client";

import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";

type Coupon = { code: string; discount_type: "percent" | "fixed"; discount_value: number; min_subtotal_cents: number; usage_limit: number | null; starts_at: string | null; ends_at: string | null; active: boolean };
const blank: Coupon = { code: "", discount_type: "percent", discount_value: 10, min_subtotal_cents: 0, usage_limit: null, starts_at: null, ends_at: null, active: false };
export default function PromotionsPage() {
  const token = useAdminToken();
  const [items, setItems] = useState<Coupon[]>([]);
  const [selected, setSelected] = useState<Coupon>({ ...blank });
  const [existing, setExisting] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { if (!token) return; void fetch("/api/admin/promotions", { headers: adminHeaders(token) }).then(async response => { if (!response.ok) throw Error("Team access required"); setItems(await response.json()); }).catch(error => setMessage(error.message)); }, [token]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!token) return;
    const response = await fetch("/api/admin/promotions", { method: existing ? "PUT" : "POST", headers: adminHeaders(token), body: JSON.stringify(selected) });
    const result = await response.json();
    if (!response.ok) { setMessage(result.error ?? "Could not save code"); return; }
    setMessage("Discount code saved."); setExisting(true);
    const list = await fetch("/api/admin/promotions", { headers: adminHeaders(token) });
    if (list.ok) setItems(await list.json());
  }
  return <AdminPageShell title="Promotions">{!token && <p>Sign in with a team account to manage codes.</p>}{message && <p role="status">{message}</p>}
    <div className="ops-panel"><h2>Discount codes</h2><p>Only an admin can create or change codes. A code is checked again against the final order subtotal when an order is placed.</p>
      {items.map(item => <button className="admin-secondary" key={item.code} onClick={() => { setSelected(item); setExisting(true); }}>{item.code} · {item.discount_type === "percent" ? `${item.discount_value}%` : `$${(item.discount_value / 100).toFixed(2)}`} · {item.active ? "ACTIVE" : "OFF"}</button>)}
      <button className="admin-secondary" onClick={() => { setSelected({ ...blank }); setExisting(false); }}>+ NEW CODE</button></div>
    <form className="ops-panel ops-form" onSubmit={save}><label>CODE<input required minLength={3} maxLength={30} pattern="[A-Z0-9_-]+" disabled={existing} value={selected.code} onChange={event => setSelected({ ...selected, code: event.target.value.toUpperCase() })} /></label>
      <label>DISCOUNT TYPE<select value={selected.discount_type} onChange={event => setSelected({ ...selected, discount_type: event.target.value as Coupon["discount_type"], discount_value: event.target.value === "percent" ? 10 : 1000 })}><option value="percent">Percentage</option><option value="fixed">Fixed AUD</option></select></label>
      <label>{selected.discount_type === "percent" ? "PERCENT" : "AMOUNT (AUD)"}<input required type="number" min={selected.discount_type === "percent" ? 1 : .01} max={selected.discount_type === "percent" ? 100 : undefined} step={selected.discount_type === "percent" ? 1 : .01} value={selected.discount_type === "percent" ? selected.discount_value : selected.discount_value / 100} onChange={event => setSelected({ ...selected, discount_value: selected.discount_type === "percent" ? Number(event.target.value) : Math.round(Number(event.target.value) * 100) })} /></label>
      <label>MINIMUM SUBTOTAL (AUD)<input type="number" min="0" step="0.01" value={selected.min_subtotal_cents / 100} onChange={event => setSelected({ ...selected, min_subtotal_cents: Math.round(Number(event.target.value) * 100) })} /></label>
      <label>USAGE LIMIT (BLANK = NONE)<input type="number" min="1" value={selected.usage_limit ?? ""} onChange={event => setSelected({ ...selected, usage_limit: event.target.value ? Number(event.target.value) : null })} /></label>
      <label>STARTS (OPTIONAL)<input type="datetime-local" value={selected.starts_at?.slice(0,16) ?? ""} onChange={event => setSelected({ ...selected, starts_at: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label>
      <label>ENDS (OPTIONAL)<input type="datetime-local" value={selected.ends_at?.slice(0,16) ?? ""} onChange={event => setSelected({ ...selected, ends_at: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label>
      <label>ACTIVE<input type="checkbox" checked={selected.active} onChange={event => setSelected({ ...selected, active: event.target.checked })} /></label>
      <button disabled={!token}>SAVE CODE</button></form></AdminPageShell>;
}
