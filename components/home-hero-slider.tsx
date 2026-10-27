"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { asset } from "@/lib/asset";

type Slide = { file: string; mobileFile?: string; alt: string; kicker: string; title: string; href: string; action: string; video?: boolean; poster?: string };

const slides: Slide[] = [
  { file: "Ignyte-Video-Website-Hero-Low-Res.mp4", mobileFile: "Ignyte-Vertical-Trimmed-Compressed-Ultra.mp4", poster: "Home-Hero-Video-Fallback.jpg", alt: "Ignyte training campaign video", kicker: "HIGH-PERFORMANCE ACTIVEWEAR_", title: "Built for the burn", href: "/shop", action: "SHOP ALL", video: true },
  { file: "Home-Hero-1.jpg", alt: "Blonde athlete training with battle ropes", kicker: "SPORTS BRAS_", title: "Support every move.", href: "/shop/sports-bras", action: "SHOP SPORTS BRAS" },
  { file: "Home-Hero-Alt-3.jpg", alt: "Athlete training in an Ignyte brown top", kicker: "TOPS_", title: "Made to move.", href: "/shop/tops", action: "SHOP TOPS" },
  { file: "Home-Hero-Alt-4.jpg", alt: "Two athletes training on ergs", kicker: "SHORTS_", title: "Move your way.", href: "/shop/shorts", action: "SHOP SHORTS" },
  { file: "Home-Hero-Alt-2-v2.jpg", alt: "Two Ignyte athletes posing in the gym", kicker: "ABOUT IGNYTE_", title: "Bring your fire.", href: "/about", action: "OUR STORY" },
];

export default function HomeHeroSlider() {
  const [active, setActive] = useState(0);
  const [mobile, setMobile] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const slide = slides[active];
  useEffect(() => {
    const query = window.matchMedia("(max-width: 800px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const move = (direction: number) => setActive(index => (index + direction + slides.length) % slides.length);

  return <section className={`home-hero home-slider ${slide.video ? "home-slide-video" : "home-slide-photo"}`} aria-label="Ignyte home media carousel" aria-roledescription="carousel" onTouchStart={event => { const touch = event.touches[0]; touchStart.current = { x: touch.clientX, y: touch.clientY }; }} onTouchEnd={event => { const start = touchStart.current; touchStart.current = null; if (!start) return; const touch = event.changedTouches[0]; const dx = touch.clientX - start.x; const dy = touch.clientY - start.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) move(dx < 0 ? 1 : -1); }}>
    <div className="home-slide-media" key={`${slide.file}-${mobile}`}>
      {slide.video ? <video src={asset(`/images/home/${mobile && slide.mobileFile ? slide.mobileFile : slide.file}`)} poster={asset(`/images/home/${slide.poster}`)} autoPlay muted playsInline loop preload="metadata" aria-label={slide.alt} /> : <img src={asset(`/images/home/${slide.file}`)} alt={slide.alt} loading={active === 0 ? "eager" : "lazy"} />}
    </div>
    <div className="home-hero-shade" />
    <div className="home-hero-content" aria-live="polite"><span className="home-kicker">{slide.kicker}</span><h1>{slide.title}</h1><Link href={slide.href} className="home-pill">{slide.action} <span>↗</span></Link></div>
    <div className="home-slider-controls"><button type="button" onClick={() => move(-1)} aria-label="Previous slide">←</button><span>{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span><button type="button" onClick={() => move(1)} aria-label="Next slide">→</button></div>
    <div className="home-slider-dots" aria-label="Choose a slide">{slides.map((item, index) => <button key={item.file} type="button" className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show slide ${index + 1}: ${item.kicker.replace("_", "")}`} aria-current={index === active ? "true" : undefined} />)}</div>
  </section>;
}
