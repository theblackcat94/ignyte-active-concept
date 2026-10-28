"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { defaultHomeHeroSettings, homeHeroMediaUrl, type HomeHeroSettings } from "@/data/home-hero";

export default function HomeHeroSlider() {
  const [settings, setSettings] = useState<HomeHeroSettings>(defaultHomeHeroSettings);
  const [active, setActive] = useState(0);
  const [mobile, setMobile] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const slides = settings.slides.filter(item => item.enabled);
  const slide = slides[active % slides.length];
  const mediaSrc = homeHeroMediaUrl(mobile && slide.mobileSrc ? slide.mobileSrc : slide.desktopSrc);
  useEffect(() => {
    void fetch("/api/home-hero", { cache: "no-store" })
      .then(response => response.ok ? response.json() as Promise<HomeHeroSettings> : null)
      .then(data => { if (data?.slides?.some(item => item.enabled)) { setSettings(data); setActive(0); } })
      .catch(() => {});
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 800px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const move = (direction: number) => setActive(index => (index + direction + slides.length) % slides.length);

  return <section className={`home-hero home-slider ${slide.kind === "video" ? "home-slide-video" : "home-slide-photo"}`} aria-label="Ignyte home media carousel" aria-roledescription="carousel" onTouchStart={event => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={event => { const start = touchStart.current; touchStart.current = null; if (!start) return; const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) move(dx < 0 ? 1 : -1); }}>
    <div className="home-slide-media" key={`${slide.id}-${mediaSrc}`}>
      {slide.kind === "video" ? <video src={mediaSrc} poster={slide.poster ? homeHeroMediaUrl(slide.poster) : undefined} autoPlay muted playsInline loop preload="metadata" aria-label={slide.alt} /> : <img src={mediaSrc} alt={slide.alt} loading={active === 0 ? "eager" : "lazy"} />}
    </div>
    <div className="home-hero-shade" />
    <div className="home-hero-content" aria-live="polite"><span className="home-kicker">{slide.kicker.startsWith("HIGH-PERFORMANCE ") ? <><span className="home-kicker-keep">HIGH-PERFORMANCE</span>{slide.kicker.slice("HIGH-PERFORMANCE".length)}</> : slide.kicker}</span><h1>{slide.title}</h1><Link href={slide.href} className="home-pill">{slide.action} <span>↗</span></Link></div>
    <div className="home-slider-controls"><button type="button" onClick={() => move(-1)} aria-label="Previous slide">←</button><span>{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span><button type="button" onClick={() => move(1)} aria-label="Next slide">→</button></div>
    <div className="home-slider-dots" aria-label="Choose a slide">{slides.map((item, index) => <button key={item.id} type="button" className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show slide ${index + 1}: ${item.kicker.replace("_", "")}`} aria-current={index === active ? "true" : undefined} />)}</div>
  </section>;
}
