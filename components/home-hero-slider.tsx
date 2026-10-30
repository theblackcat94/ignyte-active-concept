"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { defaultHomeHeroSettings, homeHeroMediaUrl, type HomeHeroSettings } from "@/data/home-hero";
import RegistrationMarks from "./registration-marks";

export default function HomeHeroSlider({ comparison = false }: { comparison?: boolean }) {
  const [settings, setSettings] = useState<HomeHeroSettings>(defaultHomeHeroSettings);
  const [active, setActive] = useState(0);
  const [viewport, setViewport] = useState<"unknown" | "mobile" | "desktop">("unknown");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [readySrc, setReadySrc] = useState("");
  const [failedSrc, setFailedSrc] = useState("");
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slides = settings.slides.filter(item => item.enabled);
  const slide = slides[active % slides.length];
  const mediaSrc = homeHeroMediaUrl(viewport === "mobile" && slide.mobileSrc ? slide.mobileSrc : slide.desktopSrc);
  const heroTitle = comparison && slide.id === "hero-film" ? "Built for the burn." : slide.title;
  const emberParts = slide.id === "hero-film" ? heroTitle.match(/^(.*?)([^\s.!?]+)([.!?]*)$/) : null;
  useEffect(() => {
    void fetch("/api/home-hero", { cache: "no-store" })
      .then(response => response.ok ? response.json() as Promise<HomeHeroSettings> : null)
      .then(data => { if (data?.slides?.some(item => item.enabled)) { setSettings(data); setActive(0); } })
      .catch(() => {});
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 800px)");
    const update = () => setViewport(query.matches ? "mobile" : "desktop");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const move = (direction: number) => setActive(index => (index + direction + slides.length) % slides.length);
  useEffect(() => {
    if (slide.kind !== "video" || reducedMotion || viewport === "unknown") return;
    const video = videoRef.current;
    if (video) {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) setReadySrc(mediaSrc);
      void video.play().catch(() => setFailedSrc(mediaSrc));
    }
    const timeout = window.setTimeout(() => {
      if (videoRef.current?.paused && !videoRef.current.ended) setActive(index => (index + 1) % slides.length);
    }, 11000);
    return () => window.clearTimeout(timeout);
  }, [active, mediaSrc, reducedMotion, slide.id, slide.kind, slides.length, viewport]);

  return <section className={`home-hero home-slider ${slide.kind === "video" ? "home-slide-video" : "home-slide-photo"}`} aria-label="Ignyte home media carousel" aria-roledescription="carousel" onTouchStart={event => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={event => { const start = touchStart.current; touchStart.current = null; if (!start) return; const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) move(dx < 0 ? 1 : -1); }}>
    <div className="home-slide-media" key={`${slide.id}-${slide.desktopSrc}-${slide.mobileSrc}`}>
      {slide.kind === "video" ? <>{(reducedMotion || failedSrc === mediaSrc) && slide.poster && <img src={homeHeroMediaUrl(slide.poster)} alt={slide.alt} />}{!reducedMotion && viewport !== "unknown" && <video key={mediaSrc} ref={videoRef} src={mediaSrc} className={readySrc === mediaSrc && failedSrc !== mediaSrc ? "is-ready" : ""} autoPlay muted playsInline preload="metadata" onLoadedData={() => setReadySrc(mediaSrc)} onError={() => setFailedSrc(mediaSrc)} onEnded={() => move(1)} aria-label={slide.alt} />}</> : <img src={mediaSrc} alt={slide.alt} loading={active === 0 ? "eager" : "lazy"} />}
    </div>
    <div className="home-hero-shade" />
    <RegistrationMarks corners={["top-left", "top-right"]} />
    <div className="home-hero-content" aria-live="polite"><span className={slide.kicker === "HIGH-PERFORMANCE ACTIVEWEAR_" ? "home-kicker mono-section-heading" : "home-kicker"}>{slide.kicker}</span><h1>{emberParts ? <>{emberParts[1]}<span className="fx-ember">{emberParts[2]}</span>{emberParts[3]}</> : heroTitle}{slide.id === "hero-film" && <sup>™</sup>}</h1><Link href={slide.href} className={`home-pill${slide.action === "SHOP SHORTS" ? " home-pill-spaced" : ""}`}>{slide.action} <span>↗</span></Link></div>
    <div className="home-slider-controls"><button type="button" onClick={() => move(-1)} aria-label="Previous slide">←</button><span>{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span><button type="button" onClick={() => move(1)} aria-label="Next slide">→</button></div>
    <div className="home-slider-dots" aria-label="Choose a slide">{slides.map((item, index) => <button key={item.id} type="button" className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show slide ${index + 1}: ${item.kicker.replace("_", "")}`} aria-current={index === active ? "true" : undefined} />)}</div>
  </section>;
}
