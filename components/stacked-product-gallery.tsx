"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Product } from "@/lib/catalog";
import ProductPhotoLightbox from "./product-photo-lightbox";
import "@/app/pdp-stack-preview.css";

export type ProductGalleryHandle = { showVideo: () => void };

const StackedProductGallery = forwardRef<ProductGalleryHandle, { product: Product }>(function StackedProductGallery({ product }, ref) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const photos = [
    { image: product.image, alt: `${product.name} in ${product.color}` },
    ...product.gallery,
  ];
  const mediaCount = photos.length + (product.pdp.video_url ? 1 : 0);
  useImperativeHandle(ref, () => ({ showVideo() {
    if (!product.pdp.video_url) return;
    goToMedia(photos.length);
    gridRef.current?.closest(".pdp-stack-media")?.scrollIntoView({ behavior: "smooth", block: "start" });
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    setMuted(true);
    video.controls = true;
    void video.play().catch(() => { video.controls = true; });
  } }));

  function updateActiveIndex() {
    if (!mobile) return;
    const grid = gridRef.current;
    if (!grid || !grid.children.length) return;
    const first = grid.children[0] as HTMLElement;
    const step = first.getBoundingClientRect().width + Number.parseFloat(getComputedStyle(grid).columnGap || "0");
    if (step > 0) setActiveIndex(Math.min(mediaCount - 1, Math.max(0, Math.round(grid.scrollLeft / step))));
  }

  function goToMedia(index: number) {
    const grid = gridRef.current;
    if (!grid) return;
    const first = grid.children[0] as HTMLElement;
    const target = grid.children[index] as HTMLElement;
    if (mobile) grid.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: "smooth" });
    else target.scrollIntoView({ behavior: "smooth", block: "center" });
    setActiveIndex(index);
  }

  return <section className="pdp-stack-media" aria-label={`${product.name} media gallery`}>
    <div className="pdp-stack-grid" ref={gridRef} onScroll={updateActiveIndex}>
      {photos.map((photo, index) => <figure className="pdp-stack-tile" key={`${photo.image}-${index}`}>
        <button type="button" className="pdp-stack-photo" onClick={() => setOpenIndex(index)} aria-label={`Enlarge photo ${index + 1} of ${photos.length}: ${photo.alt}`}>
          <img src={photo.image} alt={photo.alt} loading={index === 0 ? "eager" : "lazy"} />
          <span className="pdp-stack-zoom-cue" aria-hidden="true"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></span>
        </button>
      </figure>)}
      {product.pdp.video_url && <figure className="pdp-stack-tile pdp-stack-video">
        <video ref={videoRef} src={product.pdp.video_url} poster={product.pdp.video_poster} controls={!mobile} muted={muted} playsInline preload="none" aria-label={`${product.name} product film`} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        <figcaption>IGNYTE FILM</figcaption>
        {mobile && <div className="pdp-film-actions">
          <button type="button" aria-label={playing ? "Pause product film" : "Play product film"} onClick={() => { const video = videoRef.current; if (!video) return; if (video.paused) void video.play(); else video.pause(); }}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{playing ? <><path d="M8 5v14M16 5v14" /></> : <path d="m8 5 11 7-11 7z" />}</svg></button>
          <button type="button" aria-label={muted ? "Unmute product film" : "Mute product film"} onClick={() => setMuted(value => !value)}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z" />{muted ? <path d="m16 9 5 6m0-6-5 6" /> : <><path d="M15 9a4 4 0 0 1 0 6" /><path d="M18 6a8 8 0 0 1 0 12" /></>}</svg></button>
          <button type="button" aria-label="View product film full screen" onClick={() => { const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null; if (!video) return; if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); else if (video.requestFullscreen) void video.requestFullscreen(); }}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" /></svg></button>
        </div>}
      </figure>}
    </div>
    {mediaCount > 1 && <div className="pdp-stack-controls"><button type="button" onClick={() => goToMedia(Math.max(0, activeIndex - 1))} disabled={activeIndex === 0} aria-label="Previous product image">←</button><span>{activeIndex + 1} / {mediaCount}</span><button type="button" onClick={() => goToMedia(Math.min(mediaCount - 1, activeIndex + 1))} disabled={activeIndex === mediaCount - 1} aria-label="Next product image">→</button></div>}
    {mediaCount > 1 && <nav className="pdp-stack-thumbnails" aria-label="Product media thumbnails">{photos.map((photo, index) => <button type="button" key={`${photo.image}-thumb`} className={activeIndex === index ? "active" : ""} onClick={() => goToMedia(index)} aria-label={`Show product photo ${index + 1}`} aria-current={activeIndex === index ? "true" : undefined}><img src={photo.image} alt="" loading="lazy" /></button>)}{product.pdp.video_url && <button type="button" className={activeIndex === photos.length ? "active" : ""} onClick={() => goToMedia(photos.length)} aria-label="Show product film" aria-current={activeIndex === photos.length ? "true" : undefined}><img src={product.pdp.video_poster || product.image} alt="" loading="lazy" /><span aria-hidden="true">▶</span></button>}</nav>}
    {openIndex !== null && <ProductPhotoLightbox photos={photos} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />}
  </section>;
});

export default StackedProductGallery;
