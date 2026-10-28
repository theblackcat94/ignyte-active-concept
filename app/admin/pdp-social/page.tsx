"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";
import { browserDb } from "@/lib/commerce";
import { defaultPdpSocialSettings, type PdpSocialPost, type PdpSocialSettings } from "@/data/pdp-social";
import "./pdp-social-admin.css";

export default function PdpSocialAdminPage() {
  const token = useAdminToken();
  const [settings, setSettings] = useState<PdpSocialSettings>(defaultPdpSocialSettings);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");
  const [slugInputs, setSlugInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    void fetch("/api/admin/pdp-social", { headers: adminHeaders(token), cache: "no-store" })
      .then(async response => { if (!response.ok) throw Error("Could not load Instagram posts."); return response.json() as Promise<PdpSocialSettings>; })
      .then(data => { setSettings(data); setSlugInputs(Object.fromEntries(data.posts.map(post => [post.id, post.productSlugs.join(", ")]))); setLoaded(true); })
      .catch(error => setMessage(error.message));
  }, [token]);

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

  async function uploadImage(post: PdpSocialPost, file: File) {
    if (!token) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size < 1 || file.size > 8 * 1024 * 1024) { setMessage("Choose a JPG, PNG or WebP up to 8 MB."); return; }
    setUploading(post.id); setMessage("");
    try {
      const response = await fetch("/api/admin/home-hero/upload-ticket", { method: "POST", headers: adminHeaders(token), body: JSON.stringify({ type: file.type, size: file.size }) });
      const ticket = await response.json() as { path?: string; token?: string; url?: string; error?: string };
      if (!response.ok || !ticket.path || !ticket.token || !ticket.url) throw Error(ticket.error ?? "Could not prepare upload.");
      const { error } = await browserDb().storage.from("home-media").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (error) throw error;
      updatePost(post.id, { image: ticket.url });
      setMessage("Image uploaded. Save the Instagram strip to publish it.");
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
      setSettings(result); setSlugInputs(Object.fromEntries(result.posts.map(post => [post.id, post.productSlugs.join(", ")]))); setMessage("Saved. Refresh a product page to see the strip.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save Instagram posts."); }
    finally { setSaving(false); }
  }

  return <AdminPageShell title="Instagram strip">
    {!token && <p>Sign in with a team account to manage Instagram posts.</p>}
    {message && <p role="status" className="admin-message">{message}</p>}
    {token && loaded && <div className="ops-panel pdp-social-admin">
      <h2>Curated product-page posts</h2>
      <p>Add approved Instagram post or reel links with an image you have permission to use. Reorder them here; customers can swipe the strip on mobile. Leave the strip switched off until the posts are ready.</p>
      <label className="pdp-social-admin-toggle"><input type="checkbox" checked={settings.enabled} onChange={event => setSettings(current => ({ ...current, enabled: event.target.checked }))} /> SHOW ON PRODUCT PAGES</label>
      {settings.posts.map((post, index) => <section className="pdp-social-admin-post" key={post.id}>
        <div className="pdp-social-admin-head"><h3>POST {index + 1}</h3><div><button type="button" onClick={() => movePost(index, -1)} disabled={index === 0} aria-label={`Move post ${index + 1} up`}>↑</button><button type="button" onClick={() => movePost(index, 1)} disabled={index === settings.posts.length - 1} aria-label={`Move post ${index + 1} down`}>↓</button><button type="button" onClick={() => setSettings(current => ({ ...current, posts: current.posts.filter(item => item.id !== post.id) }))}>REMOVE</button></div></div>
        <div className="pdp-social-admin-fields">
          <label>INSTAGRAM POST OR REEL URL<input value={post.href} placeholder="https://www.instagram.com/p/.../" onChange={event => updatePost(post.id, { href: event.target.value })} /></label>
          <label>IMAGE URL<input value={post.image} placeholder="Upload an approved thumbnail below" onChange={event => updatePost(post.id, { image: event.target.value })} /></label>
          <label>IMAGE DESCRIPTION<input value={post.alt} maxLength={180} placeholder="Describe the image for accessibility" onChange={event => updatePost(post.id, { alt: event.target.value })} /></label>
          <label>SHORT CAPTION (OPTIONAL)<input value={post.caption} maxLength={160} onChange={event => updatePost(post.id, { caption: event.target.value })} /></label>
          <label className="wide">PRODUCT SLUGS (OPTIONAL, COMMA SEPARATED)<input value={slugInputs[post.id] ?? post.productSlugs.join(", ")} placeholder="Leave blank to show on every product" onChange={event => { const value = event.target.value; setSlugInputs(current => ({ ...current, [post.id]: value })); updatePost(post.id, { productSlugs: value.split(",").map(slug => slug.trim()).filter(Boolean) }); }} /></label>
          <label className="pdp-social-admin-toggle"><input type="checkbox" checked={post.enabled} onChange={event => updatePost(post.id, { enabled: event.target.checked })} /> INCLUDE THIS POST</label>
          <label className="pdp-social-admin-upload">{uploading === post.id ? "UPLOADING…" : "UPLOAD THUMBNAIL"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploading)} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImage(post, file); event.target.value = ""; }} /></label>
        </div>
        {post.image && <img className="pdp-social-admin-preview" src={post.image} alt={post.alt || "Post thumbnail preview"} />}
      </section>)}
      <div className="ops-toolbar"><button type="button" onClick={addPost} disabled={settings.posts.length >= 12}>ADD POST</button><button type="button" onClick={() => void save()} disabled={saving || Boolean(uploading)}>{saving ? "SAVING…" : "SAVE INSTAGRAM STRIP"}</button><Link href="/product/motion-sports-bra-black/" target="_blank">VIEW EXAMPLE PDP ↗</Link></div>
      <p>Up to 12 posts. Uploaded thumbnails use the existing Supabase home-media bucket. Posts without product slugs appear on every PDP; posts with slugs appear only on those products.</p>
    </div>}
  </AdminPageShell>;
}
