"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";
import { blackFridayPreview, liveAnnouncement, type Announcement, type AnnouncementSettings } from "@/data/announcement";
import "./announcement.css";

const fallback: AnnouncementSettings = { enabled: true, active: "default", default: liveAnnouncement, blackFriday: blackFridayPreview };

export default function AnnouncementAdminPage() {
  const token = useAdminToken();
  const [settings, setSettings] = useState<AnnouncementSettings>(fallback);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!token) return;
    void fetch("/api/admin/announcement", { headers: adminHeaders(token), cache: "no-store" })
      .then(async response => { if (!response.ok) throw Error("Could not load announcement settings."); return response.json() as Promise<AnnouncementSettings>; })
      .then(data => { setSettings(data); setLoaded(true); })
      .catch(error => setMessage(error.message));
  }, [token]);

  function changeVariant(key: "default" | "blackFriday", field: keyof Announcement, value: string) {
    setSettings(current => ({ ...current, [key]: { ...current[key], [field]: value } }));
  }

  async function save() {
    if (!token) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/announcement", { method: "PUT", headers: adminHeaders(token), body: JSON.stringify(settings) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error ?? "Could not save announcement settings.");
      setSettings(result as AnnouncementSettings);
      setMessage("Saved. Refresh the storefront to see the latest announcement.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save announcement settings."); }
    finally { setSaving(false); }
  }

  return <AdminPageShell title="Announcement bar">
    {!token && <p>Sign in with a team account to manage the announcement bar.</p>}
    {message && <p role="status" className="admin-message">{message}</p>}
    {token && loaded && <div className="ops-panel announcement-admin">
      <h2>Storefront announcement</h2>
      <p>Changes take effect when you save. The Black Friday draft stays off the normal storefront until you select it as active.</p>
      <div className="admin-fields">
        <label className="admin-check">SHOW ANNOUNCEMENT BAR<input type="checkbox" checked={settings.enabled} onChange={event => setSettings(current => ({ ...current, enabled: event.target.checked }))} /></label>
        <label>ACTIVE MESSAGE<select value={settings.active} onChange={event => setSettings(current => ({ ...current, active: event.target.value as AnnouncementSettings["active"] }))}><option value="default">Everyday message</option><option value="blackFriday">Black Friday</option></select></label>
      </div>
      {(["default", "blackFriday"] as const).map(key => <section key={key} className="announcement-admin-variant"><h3>{key === "default" ? "Everyday message" : "Black Friday draft"}</h3><div className="admin-fields">
        <label className="wide">MESSAGE<input value={settings[key].text} maxLength={160} onChange={event => changeVariant(key, "text", event.target.value)} /></label>
        <label>LINK TEXT<input value={settings[key].action} maxLength={80} onChange={event => changeVariant(key, "action", event.target.value)} /></label>
        <label>DESTINATION PATH<input value={settings[key].href} placeholder="/shop" onChange={event => changeVariant(key, "href", event.target.value)} /></label>
        <label>DISPLAY<select value={settings[key].mode} onChange={event => changeVariant(key, "mode", event.target.value)}><option value="static">Static</option><option value="ticker">Scrolling ticker</option></select></label>
        <label>COLOUR<select value={settings[key].theme} onChange={event => changeVariant(key, "theme", event.target.value)}><option value="dark">Night blue</option><option value="orange">Brand orange</option></select></label>
      </div></section>)}
      <div className="ops-toolbar"><button type="button" disabled={saving} onClick={() => void save()}>{saving ? "SAVING…" : "SAVE ANNOUNCEMENT SETTINGS"}</button><Link href="/?announcement=black-friday" target="_blank">PREVIEW BLACK FRIDAY ↗</Link><Link href="/" target="_blank">OPEN STOREFRONT ↗</Link></div>
      <p>To activate Black Friday, select it under Active message, leave Show announcement bar checked, and save. To deactivate it, select Everyday message or turn the bar off and save.</p>
    </div>}
  </AdminPageShell>;
}
