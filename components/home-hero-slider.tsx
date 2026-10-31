"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { defaultHomeHeroSettings, homeHeroMediaUrl, type HomeHeroSettings, type HomeHeroSlide } from "@/data/home-hero";
import RegistrationMarks from "./registration-marks";

export default function HomeHeroSlider({ comparison = false }: { comparison?: boolean }) {
  const [settings, setSettings] = useState<HomeHeroSettings>(defaultHomeHeroSettings);
  const [active, setActive] = useState(0);
  const [viewport, setViewport] = useState<"unknown" | "mobile" | "desktop">("unknown");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [readySrc, setReadySrc] = useState("");
  const [failedSrc, setFailedSrc] = useState("");
  const [timerReset, setTimerReset] = useState(0);
  const [outgoing, setOutgoing] = useState<HomeHeroSlide | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const transitionRef = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const slides = settings.slides.filter(item => item.enabled);
  const slide = slides[active % slides.length];
  const mediaSrc = homeHeroMediaUrl(viewport === "mobile" && slide.mobileSrc ? slide.mobileSrc : slide.desktopSrc);
  const changeSlide = (next: number) => {
    if (transitionRef.current !== null) window.clearTimeout(transitionRef.current);
    if (next === active) { setTimerReset(value => value + 1); return; }
    if (next === 0) setReadySrc("");
    if (reducedMotion) { setOutgoing(null); setTransitioning(false); setActive(next); setTimerReset(value => value + 1); return; }
    setOutgoing(slide);
    setTransitioning(false);
    setActive(next);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setTransitioning(true)));
    transitionRef.current = window.setTimeout(() => { setOutgoing(null); setTransitioning(false); setTimerReset(value => value + 1); transitionRef.current = null; }, 800);
  };
  useEffect(() => {
    void fetch("/api/home-hero", { cache: "no-store" })
      .then(response => response.ok ? response.json() as Promise<HomeHeroSettings> : null)
      .then(data => { if (data?.slides?.some(item => item.enabled)) { setSettings(data); setActive(0); setOutgoing(null); } })
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
  const move = (direction: number) => {
    changeSlide((active + direction + slides.length) % slides.length);
  };
  useEffect(() => {
    if (slide.kind !== "video" || reducedMotion || viewport === "unknown") return;
    const video = videoRef.current;
    if (video) {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) setReadySrc(mediaSrc);
      void video.play().catch(() => setFailedSrc(mediaSrc));
    }
  }, [active, mediaSrc, reducedMotion, slide.kind, viewport]);
  useEffect(() => {
    if (viewport === "unknown" || outgoing || slides.length < 2 || (slide.kind === "video" && !reducedMotion && readySrc !== mediaSrc && failedSrc !== mediaSrc)) return;
    const timeout = window.setTimeout(() => changeSlide((active + 1) % slides.length), active === 0 ? 11000 : 5000);
    return () => window.clearTimeout(timeout);
  }, [active, timerReset, reducedMotion, slides.length, viewport, outgoing, slide.kind, readySrc, failedSrc, mediaSrc]);

  useEffect(() => () => { if (transitionRef.current !== null) window.clearTimeout(transitionRef.current); }, []);

  const renderSlide = (item: HomeHeroSlide, isOutgoing: boolean) => {
    const src = homeHeroMediaUrl(viewport === "mobile" && item.mobileSrc ? item.mobileSrc : item.desktopSrc);
    const poster = homeHeroMediaUrl(viewport === "mobile" && item.id === "hero-film" ? "/images/home/mobile-hero-poster.webp" : item.poster);
    const title = comparison && item.id === "hero-film" ? "Built for the burn." : item.title;
    const emberParts = item.id === "hero-film" ? title.match(/^(.*?)([^\s.!?]+)([.!?]*)$/) : item.id === "about" ? title.match(/^(.*?)(\bfire\b)(.*)$/i) : null;
    return <div key={`${item.id}-${isOutgoing ? "out" : "in"}`} className={`home-slide-layer ${item.kind === "video" ? "home-slide-video" : "home-slide-photo"} ${isOutgoing ? `home-slide-outgoing${transitioning ? " is-fading" : ""}` : outgoing && !transitioning ? "home-slide-entering" : ""}`} aria-hidden={isOutgoing || undefined}>
      <div className="home-slide-media">
        {item.kind === "video" ? <><picture className="home-slide-poster">{item.id === "hero-film" && <source media="(max-width: 800px)" srcSet={homeHeroMediaUrl("/images/home/mobile-hero-poster.webp")} />}<img src={homeHeroMediaUrl(item.poster)} alt="" aria-hidden="true" fetchPriority={isOutgoing ? "auto" : "high"} /></picture>{!reducedMotion && viewport !== "unknown" && <video key={src} ref={isOutgoing ? undefined : videoRef} src={src} poster={poster} className={readySrc === src && failedSrc !== src ? "is-ready" : ""} autoPlay muted playsInline preload="metadata" onLoadedData={() => setReadySrc(src)} onError={() => setFailedSrc(src)} aria-label={item.alt} />}</> : <img src={src} alt={item.alt} loading={isOutgoing || active === 0 ? "eager" : "lazy"} />}
      </div>
      <div className="home-hero-shade" />
      <div className="home-hero-content"><span className={item.kicker === "HIGH-PERFORMANCE ACTIVEWEAR_" ? "home-kicker mono-section-heading" : "home-kicker"}>{item.kicker}</span><h1>{emberParts ? <>{emberParts[1]}<span className="fx-ember">{emberParts[2]}</span>{emberParts[3]}</> : title}{item.id === "hero-film" && <sup>™</sup>}</h1><Link href={item.href} className={`home-pill${item.action === "SHOP SHORTS" ? " home-pill-spaced" : ""}`}>{item.action} <span>↗</span></Link></div>
    </div>;
  };

  return <section className="home-hero home-slider" aria-label="Ignyte home media carousel" aria-roledescription="carousel" onTouchStart={event => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={event => { const start = touchStart.current; touchStart.current = null; if (!start) return; const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) move(dx < 0 ? 1 : -1); }}>
    {outgoing && renderSlide(outgoing, true)}
    {renderSlide(slide, false)}
    <RegistrationMarks corners={["top-left", "top-right"]} />
    <div className="home-slider-controls"><button type="button" onClick={() => move(-1)} aria-label="Previous slide">←</button><span>{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span><button type="button" onClick={() => move(1)} aria-label="Next slide">→</button></div>
    <div className="home-slider-dots" aria-label="Choose a slide">{slides.map((item, index) => <button key={item.id} type="button" className={index === active ? "active" : ""} onClick={() => changeSlide(index)} aria-label={`Show slide ${index + 1}: ${item.kicker.replace("_", "")}`} aria-current={index === active ? "true" : undefined} />)}</div>
  </section>;
}
