"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageShell, adminHeaders, useAdminToken } from "@/components/admin-page-shell";
import { browserDb } from "@/lib/commerce";
import { defaultHomeHeroSettings, homeHeroMediaUrl, type HomeHeroSettings, type HomeHeroSlide } from "@/data/home-hero";
import "./home-hero.css";

type MediaField = "desktopSrc" | "mobileSrc" | "poster";

export default function HomeHeroAdminPage() {
  const token = useAdminToken();
  const [settings, setSettings] = useState<HomeHeroSettings>(defaultHomeHeroSettings);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    void fetch("/api/admin/home-hero", { headers: adminHeaders(token), cache: "no-store" })
      .then(async response => { if (!response.ok) throw Error("Could not load homepage slides."); return response.json() as Promise<HomeHeroSettings>; })
      .then(data => { setSettings(data); setLoaded(true); })
      .catch(error => setMessage(error.message));
  }, [token]);

  function updateSlide(id: string, patch: Partial<HomeHeroSlide>) {
    setSettings(current => ({ slides: current.slides.map(slide => slide.id === id ? { ...slide, ...patch } : slide) }));
  }

  function moveSlide(index: number, direction: number) {
    setSettings(current => {
      const slides = [...current.slides];
      const next = index + direction;
      if (next < 0 || next >= slides.length) return current;
      [slides[index], slides[next]] = [slides[next], slides[index]];
      return { slides };
    });
  }

  function addSlide() {
    if (settings.slides.length >= 10) return;
    setSettings(current => ({ slides: [...current.slides, {
      id: crypto.randomUUID(), enabled: true, kind: "image", desktopSrc: "", mobileSrc: "", poster: "",
      alt: "", kicker: "", title: "", href: "/shop", action: "SHOP ALL",
    }] }));
  }

  async function uploadMedia(slide: HomeHeroSlide, field: MediaField, file: File) {
    if (!token) return;
    const expectedVideo = slide.kind === "video" && field !== "poster";
    const permitted = expectedVideo ? ["video/mp4"] : ["image/jpeg", "image/png", "image/webp"];
    const limit = expectedVideo ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!permitted.includes(file.type) || file.size < 1 || file.size > limit) {
      setMessage(expectedVideo ? "Choose an MP4 up to 50 MB." : "Choose a JPG, PNG or WebP up to 8 MB."); return;
    }
    setUploading(`${slide.id}-${field}`); setMessage("");
    try {
      const ticketResponse = await fetch("/api/admin/home-hero/upload-ticket", {
        method: "POST", headers: adminHeaders(token), body: JSON.stringify({ type: file.type, size: file.size }),
      });
      const ticket = await ticketResponse.json() as { path?: string; token?: string; url?: string; error?: string };
      if (!ticketResponse.ok || !ticket.path || !ticket.token || !ticket.url) throw Error(ticket.error ?? "Could not prepare upload.");
      const { error } = await browserDb().storage.from("home-media").uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type });
      if (error) throw error;
      updateSlide(slide.id, { [field]: ticket.url });
      setMessage("Media uploaded. Save the carousel to publish this change.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Media upload failed."); }
    finally { setUploading(""); }
  }

  async function save() {
    if (!token || uploading) return;
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/home-hero", { method: "PUT", headers: adminHeaders(token), body: JSON.stringify(settings) });
      const result = await response.json() as HomeHeroSettings & { error?: string };
      if (!response.ok) throw Error(result.error ?? "Could not save homepage slides.");
      setSettings(result); setMessage("Saved. Refresh the homepage to see the carousel update.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save homepage slides."); }
    finally { setSaving(false); }
  }

  return <AdminPageShell title="Homepage carousel">
    {!token && <p>Sign in with a team account to manage homepage slides.</p>}
    {message && <p role="status" className="admin-message">{message}</p>}
    {token && loaded && <div className="ops-panel home-hero-admin">
      <h2>Homepage hero slides</h2>
      <p>Reorder, hide, add or remove slides; update their text and links; and upload desktop or mobile media. Save to publish. The first visible slide opens the carousel. Videos play automatically, while slides advance manually.</p>
      {settings.slides.map((slide, index) => <section className="home-hero-admin-slide" key={slide.id}>
        <div className="home-hero-admin-head"><h3>SLIDE {index + 1} · {slide.title || "NEW SLIDE"}</h3><div className="home-hero-admin-actions">
          <button type="button" onClick={() => moveSlide(index, -1)} disabled={index === 0} aria-label={`Move slide ${index + 1} up`}>↑</button>
          <button type="button" onClick={() => moveSlide(index, 1)} disabled={index === settings.slides.length - 1} aria-label={`Move slide ${index + 1} down`}>↓</button>
          <button type="button" onClick={() => setSettings(current => ({ slides: current.slides.filter(item => item.id !== slide.id) }))} disabled={settings.slides.length === 1}>REMOVE</button>
        </div></div>
        <div className="home-hero-admin-fields">
          <label className="home-hero-admin-check">VISIBLE<input type="checkbox" checked={slide.enabled} onChange={event => updateSlide(slide.id, { enabled: event.target.checked })} /></label>
          <label>MEDIA TYPE<select value={slide.kind} onChange={event => updateSlide(slide.id, { kind: event.target.value as HomeHeroSlide["kind"], desktopSrc: "", mobileSrc: "", poster: "" })}><option value="image">Image</option><option value="video">Video</option></select></label>
          <label>EYEBROW<input value={slide.kicker} maxLength={80} onChange={event => updateSlide(slide.id, { kicker: event.target.value })} /></label>
          <label>HEADLINE<input value={slide.title} maxLength={100} onChange={event => updateSlide(slide.id, { title: event.target.value })} /></label>
          <label>BUTTON TEXT<input value={slide.action} maxLength={80} onChange={event => updateSlide(slide.id, { action: event.target.value })} /></label>
          <label>BUTTON DESTINATION<input value={slide.href} placeholder="/shop" onChange={event => updateSlide(slide.id, { href: event.target.value })} /></label>
          <label className="wide">IMAGE / VIDEO DESCRIPTION<input value={slide.alt} maxLength={180} onChange={event => updateSlide(slide.id, { alt: event.target.value })} /></label>
          {(["desktopSrc", "mobileSrc", "poster"] as const).filter(field => field !== "poster" || slide.kind === "video").map(field => <div className="home-hero-admin-media" key={field}>
            <label>{field === "desktopSrc" ? "DESKTOP MEDIA" : field === "mobileSrc" ? "MOBILE MEDIA (OPTIONAL)" : "VIDEO POSTER (OPTIONAL)"}<input value={slide[field]} placeholder="Upload or enter an approved media path" onChange={event => updateSlide(slide.id, { [field]: event.target.value })} /></label>
            <label className="home-hero-admin-upload">{uploading === `${slide.id}-${field}` ? "UPLOADING…" : "UPLOAD FILE"}<input type="file" disabled={Boolean(uploading)} accept={slide.kind === "video" && field !== "poster" ? "video/mp4" : "image/jpeg,image/png,image/webp"} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadMedia(slide, field, file); event.target.value = ""; }} /></label>
          </div>)}
        </div>
        {slide.desktopSrc && <div className="home-hero-admin-preview">{slide.kind === "video" ? <video src={homeHeroMediaUrl(slide.desktopSrc)} poster={slide.poster ? homeHeroMediaUrl(slide.poster) : undefined} controls preload="none" /> : <img src={homeHeroMediaUrl(slide.desktopSrc)} alt={slide.alt} />}</div>}
      </section>)}
      <div className="ops-toolbar"><button type="button" onClick={addSlide} disabled={settings.slides.length >= 10}>ADD SLIDE</button><button type="button" onClick={() => void save()} disabled={saving || Boolean(uploading)}>{saving ? "SAVING…" : "SAVE HOMEPAGE CAROUSEL"}</button><Link href="/" target="_blank">VIEW HOMEPAGE ↗</Link></div>
      <p>Uploads are stored in Supabase Storage. A desktop image or video is required; mobile media and video posters are optional. The default media remains available in the site code.</p>
    </div>}
  </AdminPageShell>;
}
