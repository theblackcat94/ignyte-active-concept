"use client";
import { useEffect, useState } from "react";
import { adminHeaders } from "@/components/admin-page-shell";

type Settings = {
  first_fit_enabled: boolean;
  first_fit_request_window_days: number | null;
  first_fit_max_items: 1;
  first_fit_return_postage: "pending" | "customer" | "ignyte";
  first_fit_replacement_postage: "pending" | "customer" | "ignyte";
};

export default function FirstFitAdminSettings({ token }: { token: string | null }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetch("/api/admin/first-fit/", { headers: adminHeaders(token), cache: "no-store" }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "IGNYTE Fit Guarantee settings are unavailable.");
      if (!cancelled) { setSettings(result.settings); setPublicEnabled(result.public_enabled); }
    }).catch(cause => { if (!cancelled) setMessage(cause instanceof Error ? cause.message : "IGNYTE Fit Guarantee settings are unavailable."); });
    return () => { cancelled = true; };
  }, [token]);
  async function save() {
    if (!token || !settings || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/first-fit/", { method: "PUT", headers: adminHeaders(token), body: JSON.stringify(settings) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Could not save settings.");
      setMessage("IGNYTE Fit Guarantee settings saved. The public launch flag and fulfilment approval are separate.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Could not save settings."); }
    finally { setBusy(false); }
  }
  return <section className="ops-panel return-admin-settings"><h2>THE IGNYTE FIT GUARANTEE™_</h2><p>Private programme settings. Public launch: {publicEnabled ? "enabled" : "off"}. The customer exchange route also requires a separate server flag; changing these fields alone cannot activate it.</p>
    {settings && <><label><input type="checkbox" checked={settings.first_fit_enabled} onChange={event => setSettings({ ...settings, first_fit_enabled: event.target.checked })} /> Enable programme after approved terms and deployment</label><label>Request window after recorded delivery, days<input type="number" min={1} max={90} value={settings.first_fit_request_window_days ?? ""} onChange={event => setSettings({ ...settings, first_fit_request_window_days: event.target.value ? Number(event.target.value) : null })} /></label><p>Exchange allowance: one item on the first eligible order.</p><label>Return postage<select value={settings.first_fit_return_postage} onChange={event => setSettings({ ...settings, first_fit_return_postage: event.target.value as Settings["first_fit_return_postage"] })}><option value="pending">Pending approval</option><option value="customer">Customer pays</option><option value="ignyte">IGNYTE pays</option></select></label><label>Replacement postage<select value={settings.first_fit_replacement_postage} onChange={event => setSettings({ ...settings, first_fit_replacement_postage: event.target.value as Settings["first_fit_replacement_postage"] })}><option value="pending">Pending approval</option><option value="customer">Customer pays</option><option value="ignyte">IGNYTE pays</option></select></label><button type="button" disabled={busy} onClick={() => void save()}>SAVE FIRST FIT SETTINGS</button></>}
    {message && <p role="status">{message}</p>}</section>;
}
