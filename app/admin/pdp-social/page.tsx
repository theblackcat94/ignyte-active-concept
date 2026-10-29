"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";
import { browserDb } from "@/lib/commerce";
import { defaultPdpSocialSettings, socialCoverImages, suppliedSocialCovers, type PdpSocialPost, type PdpSocialSettings } from "@/data/pdp-social";
import "./pdp-social-admin.css";

export default function PdpSocialAdminPage() {
  const token = useAdminToken();
  const [settings, setSettings] = useState<PdpSocialSettings>(defaultPdpSocialSettings);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const [slugInputs, setSlugInputs] = useState<Record<string, string>>({});
  const [connection, setConnection] = useState<{ configured: boolean; mediaCount?: number; lastRefresh?: string; automatic?: boolean } | null>(null);
  const [checkingConnection, setCheckingConnection] = useState(false);

  useEffect(() => {
    if (!token) return;
    void fetch("/api/admin/pdp-social", { headers: adminHeaders(token), cache: "no-store" })
      .then(async response => { if (!response.ok) throw Error("Could not load Instagram posts."); return response.json() as Promise<PdpSocialSettings>; })
      .then(data => { setSettings(data); setSlugInputs(Object.fromEntries(data.posts.map(post => [post.id, post.productSlugs.join(", ")]))); setLoaded(true); })
      .catch(error => setMessage(error.message));
  }, [token]);
  useEffect(() => { if (!token) return; void fetch("/api/admin/instagram-connection", { headers: adminHeaders(token), cache: "no-store" }).then(response => response.json()).then(setConnection).catch(() => setConnection(null)); }, [token]);

  async function checkConnection() {
    if (!token) return;
    setCheckingConnection(true);
    try {
      const response = await fetch("/api/admin/instagram-connection", { method: "POST", headers: adminHeaders(token), cache: "no-store" });
      const result = await response.json() as { configured?: boolean; mediaCount?: number; lastRefresh?: string; automatic?: boolean; error?: string };
      if (!response.ok) throw Error(result.error ?? "Connection check failed.");
      setConnection({ configured: true, mediaCount: result.mediaCount, lastRefresh: result.lastRefresh, automatic: result.automatic });
      const latest = await fetch("/api/admin/pdp-social", { headers: adminHeaders(token), cache: "no-store" }).then(response => response.json()) as PdpSocialSettings;
      setSettings(latest);
      setMessage(`Meta returned ${result.mediaCount ?? 0} usable posts. Review the feed before enabling automatic updates; the manual feed remains live.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connection check failed."); }
    finally { setCheckingConnection(false); }
  }

  function updatePost(id: string, patch: Partial<PdpSocialPost>) {
    setSettings(current => ({ ...current, posts: current.posts.map(post => post.id === id ? { ...post, ...patch } : post) }));
  }

  function movePost(index: number, direction: number) {
    setSettings(current => {
      const posts = [...current.posts];
      const next = index + direction;
      if (next < 0 || next >= posts.length) return current;
      [posts[index], posts[next]] = [posts[next], posts[index]];
      return { ...current, posts };
    });
  }

  function addPost() {
    if (settings.posts.length >= 12) return;
    setSettings(current => ({ ...current, posts: [...current.posts, { id: crypto.randomUUID(), enabled: true, href: "", image: "", alt: "", caption: "", productSlugs: [] }] }));
  }

  async function uploadMedia(post: PdpSocialPost, file: File, kind: "image" | "video") {
    if (!token) return;
    if (kind === "image" ? (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 8 * 1024 * 1024) : (file.type !== "video/mp4" || file.size < 1 || file.size > 50 * 1024 * 1024)) { setMessage(kind === "image" ? "Choose a JPG, PNG or WebP up to 8 MB." : "Choose an MP4 up to 50 MB."); return; }
    setUploading(post.id); setMessage("");
    try {
      const response = await fetch("/api/admin/home-hero/upload-ticket", { method: "POST", headers: adminHeaders(token), body: JSON.stringify({ type: file.type, size: file.size }) });
      const ticket = await response.json() as { path?: string; token?: string; url?: string; error?: string };
      if (!response.ok || !ticket.path || !ticket.token || !ticket.url) throw Error(ticket.error ?? "Could not prepare upload.");
      const { error } = await browserDb().storage.from("home-media").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (error) throw error;
      updatePost(post.id, kind === "image" ? { image: ticket.url, embed: false } : { video: ticket.url, embed: false });
      setMessage("Media uploaded. Save the Instagram strip to publish it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setUploading(""); }
  }

  async function save() {
    if (!token || uploading) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/pdp-social", { method: "PUT", headers: adminHeaders(token), body: JSON.stringify(settings) });
      const result = await response.json() as PdpSocialSettings & { error?: string };
      if (!response.ok) throw Error(result.error ?? "Could not save Instagram posts.");
      setSettings(result); setSlugInputs(Object.fromEntries(result.posts.map(post => [post.id, post.productSlugs.join(", ")]))); setMessage("Saved. The home and product strips refresh when shoppers return to the tab.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save Instagram posts."); }
    finally { setSaving(false); }
  }

  return <AdminPageShell title="Instagram strip">
    {!token && <p>Sign in with a team account to manage Instagram posts.</p>}
    {message && <p role="status" className="admin-message">{message}</p>}
    {token && <div className="ops-panel pdp-social-connection"><h2>Automatic feed connection</h2><p>Use the direct Meta Instagram API without a paid feed service. An IG Business or Creator account, a Meta app, Instagram Business Basic permission and a server-only access token are required. A token never appears on the storefront. Reconnect by replacing the server credential and running this check again.</p><p>Connection: <strong>{connection?.configured ? "SERVER CREDENTIAL PRESENT" : "AWAITING META AUTHORISATION"}</strong>{connection?.lastRefresh && <> · Last successful refresh: {new Date(connection.lastRefresh).toLocaleString("en-AU")}</>}. The public feed refreshes at most hourly and keeps its last successful posts if Meta is temporarily unavailable.</p><button type="button" disabled={!connection?.configured || checkingConnection} onClick={() => void checkConnection()}>{checkingConnection ? "CHECKING…" : "TEST AND REFRESH META FEED"}</button><label className="pdp-social-admin-toggle"><input type="checkbox" checked={Boolean(settings.automatic)} disabled={!connection?.configured || !settings.cachedPosts?.length} onChange={event => setSettings(current => ({ ...current, automatic: event.target.checked }))} /> USE VERIFIED AUTOMATIC FEED AFTER SAVING</label><p>Manual post controls below remain the fallback. Matching posts can override covers, captions and visibility; keep collaborative posts here when Meta does not return them. Review the cached covers below before switching.</p>{Boolean(settings.cachedPosts?.length) && <div className="pdp-social-cached-preview" aria-label="Cached automatic Instagram feed">{settings.cachedPosts?.map(post => <a key={post.id} href={post.href} target="_blank" rel="noopener noreferrer"><img src={post.image} alt={post.alt} /><span>{post.caption}</span></a>)}</div>}</div>}
    {token && loaded && <div className="ops-panel pdp-social-admin">
      <h2>Curated Instagram posts</h2>
      <p>Add public Instagram post or reel links and upload matching thumbnails or videos. The ten supplied post covers appear by default. The first ten enabled posts appear on the homepage and product pages; customers can swipe the strip on mobile.</p>
      <label className="pdp-social-admin-toggle"><input type="checkbox" checked={settings.enabled} onChange={event => setSettings(current => ({ ...current, enabled: event.target.checked }))} /> SHOW ON HOMEPAGE AND PRODUCT PAGES</label>
      {settings.posts.map((post, index) => <section className="pdp-social-admin-post" key={post.id}>
        <div className="pdp-social-admin-head"><h3>POST {index + 1}</h3><div><button type="button" onClick={() => movePost(index, -1)} disabled={index === 0} aria-label={`Move post ${index + 1} up`}>↑</button><button type="button" onClick={() => movePost(index, 1)} disabled={index === settings.posts.length - 1} aria-label={`Move post ${index + 1} down`}>↓</button><button type="button" onClick={() => setSettings(current => ({ ...current, posts: current.posts.filter(item => item.id !== post.id) }))}>REMOVE</button></div></div>
        <div className="pdp-social-admin-fields">
          <label>INSTAGRAM POST OR REEL URL<input value={post.href} placeholder="https://www.instagram.com/p/.../" onChange={event => updatePost(post.id, { href: event.target.value })} /></label>
          <label>IMAGE URL<input value={post.image} placeholder="Upload a matching thumbnail below, or use the brand cover" onChange={event => updatePost(post.id, { image: event.target.value, embed: false })} /></label>
          <label>VIDEO URL (OPTIONAL)<input value={post.video ?? ""} placeholder="Upload a licensed MP4 below" onChange={event => updatePost(post.id, { video: event.target.value, embed: false })} /></label>
          <label>IMAGE DESCRIPTION<input value={post.alt} maxLength={180} placeholder="Describe the image for accessibility" onChange={event => updatePost(post.id, { alt: event.target.value })} /></label>
          <label>SHORT CAPTION (OPTIONAL)<input value={post.caption} maxLength={160} onChange={event => updatePost(post.id, { caption: event.target.value })} /></label>
          <label>CROP HORIZONTAL (0–100)<input type="number" min="0" max="100" value={post.cropX ?? 50} onChange={event => updatePost(post.id, { cropX: Number(event.target.value) })} /></label>
          <label>CROP VERTICAL (0–100)<input type="number" min="0" max="100" value={post.cropY ?? 50} onChange={event => updatePost(post.id, { cropY: Number(event.target.value) })} /></label>
          <label className="wide">PRODUCT SLUGS (OPTIONAL, COMMA SEPARATED)<input value={slugInputs[post.id] ?? post.productSlugs.join(", ")} placeholder="Leave blank to show on every product" onChange={event => { const value = event.target.value; setSlugInputs(current => ({ ...current, [post.id]: value })); updatePost(post.id, { productSlugs: value.split(",").map(slug => slug.trim()).filter(Boolean) }); }} /></label>
          <label className="pdp-social-admin-toggle"><input type="checkbox" checked={post.enabled} onChange={event => updatePost(post.id, { enabled: event.target.checked })} /> INCLUDE THIS POST</label>
          <label className="pdp-social-admin-upload">{uploading === post.id ? "UPLOADING…" : "UPLOAD THUMBNAIL"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadMedia(post, file, "image"); event.target.value = ""; }} /></label>
          <label className="pdp-social-admin-upload">{uploading === post.id ? "UPLOADING…" : "UPLOAD VIDEO"}<input type="file" accept="video/mp4" disabled={Boolean(uploading)} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadMedia(post, file, "video"); event.target.value = ""; }} /></label>
        </div>
        <img className="pdp-social-admin-preview" src={post.image || suppliedSocialCovers[post.href.match(/\/(?:p|reel)\/([^/]+)/)?.[1] || ""] || socialCoverImages[index % socialCoverImages.length]} alt={post.alt || "Instagram post cover preview"} style={{ objectPosition: `${post.cropX ?? 50}% ${post.cropY ?? 50}%` }} />
        {post.href && <p><a href={post.href} target="_blank" rel="noopener noreferrer">VIEW INSTAGRAM POST ↗</a></p>}
      </section>)}
      <div className="ops-toolbar"><button type="button" onClick={addPost} disabled={settings.posts.length >= 12}>ADD POST</button><button type="button" onClick={() => void save()} disabled={saving || Boolean(uploading)}>{saving ? "SAVING…" : "SAVE INSTAGRAM STRIP"}</button><Link href="/product/motion-sports-bra-black/" target="_blank">VIEW EXAMPLE PDP ↗</Link></div>
      <p>Up to 12 posts. Uploaded thumbnails use the existing Supabase home-media bucket and replace the supplied cover for that post. Posts without product slugs appear on every PDP; posts with slugs appear only on those products.</p>
    </div>}
  </AdminPageShell>;
}
