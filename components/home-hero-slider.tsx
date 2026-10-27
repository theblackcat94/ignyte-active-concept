"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { asset } from "@/lib/asset";

type Slide = { file: string; mobileFile?: string; alt: string; kicker: string; title: string; href: string; action: string; portrait?: boolean; video?: boolean; poster?: string };

const slides: Slide[] = [
  { file: "Ignyte-Video-Website-Hero-Low-Res.mp4", mobileFile: "Ignyte-Vertical-Trimmed-Compressed-Ultra.mp4", poster: "Home-Hero-Video-Fallback.jpg", alt: "Ignyte training campaign video", kicker: "BRING THE FIRE_", title: "Move with purpose.", href: "/shop", action: "SHOP THE COLLECTION", video: true },
  { file: "Home-Hero-1.jpg", alt: "Athlete training with battle ropes", kicker: "HIGH-PERFORMANCE ACTIVEWEAR_", title: "Built for the burn.", href: "/shop", action: "SHOP BEST SELLERS" },
  { file: "Home-Hero-Alt-2.jpg", alt: "Two Ignyte athletes in the gym", kicker: "MADE FOR MOVEMENT_", title: "Train your way.", href: "/shop", action: "EXPLORE IGNYTE" },
  { file: "Home-Hero-Alt-3.jpg", alt: "Athlete training in Ignyte activewear", kicker: "BRING THE FIRE_", title: "Show up strong.", href: "/shop", action: "SHOP ALL" },
  { file: "Ignyte-Collections.jpg", alt: "Ignyte activewear collection campaign", kicker: "THE COLLECTION_", title: "Find your fit.", href: "/shop", action: "SHOP ALL", portrait: true },
  { file: "Ignyte-Support-Bras.jpg", alt: "Athlete wearing an Ignyte support bra", kicker: "SPORTS BRAS_", title: "Feel supported.", href: "/shop/sports-bras", action: "SHOP BRAS", portrait: true },
  { file: "Ignyte-Tops-Vertical.jpg", alt: "Ignyte activewear top", kicker: "TOPS_", title: "Made to move.", href: "/shop/tops", action: "SHOP TOPS", portrait: true },
  { file: "Ignyte-Shorts-Vertical.jpg", alt: "Ignyte activewear shorts", kicker: "SHORTS_", title: "Move freely.", href: "/shop/shorts", action: "SHOP SHORTS", portrait: true },
  { file: "Home-Hero-Video-Fallback.jpg", alt: "Ignyte athlete in training", kicker: "BUILT FOR THE BURN_", title: "Own the moment.", href: "/shop", action: "SHOP ALL" },
  { file: "Ignyte-Leggings-Vertical.jpg", alt: "Ignyte activewear leggings", kicker: "LEGGINGS_", title: "Every rep counts.", href: "/shop/leggings", action: "SHOP LEGGINGS", portrait: true },
  { file: "Ignyte-Accessories-Vertical.jpg", alt: "Ignyte socks and training shoes", kicker: "ACCESSORIES_", title: "The final detail.", href: "/shop", action: "SHOP ALL", portrait: true },
  { file: "Ignyte-Sports-Bras-Vertical.jpg", alt: "Ignyte sports bra", kicker: "SPORTS BRAS_", title: "Train with fire.", href: "/shop/sports-bras", action: "SHOP BRAS", portrait: true },
];

export default function HomeHeroSlider() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mobile, setMobile] = useState(false);
  const slide = slides[active];
  useEffect(() => {
    const query = window.matchMedia("(max-width: 800px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setActive(index => (index + 1) % slides.length), slide.video ? 14000 : 6500);
    return () => window.clearTimeout(timer);
  }, [active, paused, slide.video]);
  const move = (direction: number) => setActive(index => (index + direction + slides.length) % slides.length);

  return <section className={`home-hero home-slider ${slide.portrait ? "home-slide-portrait" : ""}`} aria-label="Ignyte home media carousel" aria-roledescription="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false); }}>
    <div className="home-slide-media" key={`${slide.file}-${mobile}`}>
      {slide.video ? <video src={asset(`/images/home/${mobile && slide.mobileFile ? slide.mobileFile : slide.file}`)} poster={asset(`/images/home/${slide.poster}`)} autoPlay muted playsInline loop preload="metadata" aria-label={slide.alt} /> : <img src={asset(`/images/home/${slide.file}`)} alt={slide.alt} loading={active === 0 ? "eager" : "lazy"} />}
    </div>
    <div className="home-hero-shade" />
    <div className="home-hero-content" aria-live="polite"><span className="home-kicker">{slide.kicker}</span><h1>{slide.title}</h1><Link href={slide.href} className="home-pill">{slide.action} <span>↗</span></Link></div>
    <div className="home-slider-controls"><button type="button" onClick={() => move(-1)} aria-label="Previous slide">←</button><span>{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span><button type="button" onClick={() => move(1)} aria-label="Next slide">→</button></div>
    <div className="home-slider-dots" aria-label="Choose a slide">{slides.map((item, index) => <button key={item.file} type="button" className={index === active ? "active" : ""} onClick={() => setActive(index)} aria-label={`Show slide ${index + 1}: ${item.kicker.replace("_", "")}`} aria-current={index === active ? "true" : undefined} />)}</div>
  </section>;
}
