"use client";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";

type Rate = { state: string; rate_cents: number; free_threshold_cents: number | null; active: boolean };
const states = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
export default function ShippingPage() {
  const token = useAdminToken();
  const [rates, setRates] = useState<Rate[]>(states.map(state => ({ state, rate_cents: 0, free_threshold_cents: null, active: false })));
  const [message, setMessage] = useState("");
  useEffect(() => { if (!token) return; void fetch("/api/admin/shipping", { headers: adminHeaders(token) }).then(async response => { if (!response.ok) throw Error("Team access required"); const saved = await response.json() as Rate[]; setRates(states.map(state => saved.find(item => item.state === state) ?? { state, rate_cents: 0, free_threshold_cents: null, active: false })); }).catch(error => setMessage(error.message)); }, [token]);
  function change(state: string, patch: Partial<Rate>) { setRates(current => current.map(item => item.state === state ? { ...item, ...patch } : item)); }
  async function save(rate: Rate) { if (!token) return; const response = await fetch("/api/admin/shipping", { method: "PUT", headers: adminHeaders(token), body: JSON.stringify(rate) }); setMessage(response.ok ? `${rate.state} rate saved.` : (await response.json()).error ?? "Could not save rate."); }
  return <AdminPageShell title="Shipping"><div className="ops-panel"><h2>Australian delivery rates</h2><p>The approved launch rate is AU$15 below AU$100 after discounts, and free shipping applies at AU$100 or more. State rates are editable below; active rates appear in checkout totals.</p></div>
    {!token && <p>Sign in with a team account.</p>}{message && <p role="status">{message}</p>}
    {rates.map(rate => <div className="ops-panel" key={rate.state}><h2>{rate.state}</h2><div className="ops-form"><label>RATE BELOW $100 (AUD)<input type="number" min="0" step="0.01" value={rate.rate_cents / 100} onChange={event => change(rate.state, { rate_cents: Math.round(Number(event.target.value) * 100) })} /></label><label>ACTIVE<input type="checkbox" checked={rate.active} onChange={event => change(rate.state, { active: event.target.checked })} /></label><button type="button" disabled={!token} onClick={() => void save(rate)}>SAVE {rate.state}</button></div></div>)}</AdminPageShell>;
}
