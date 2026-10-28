"use client";

import { useRef, useState } from "react";
import type { Product } from "@/lib/catalog";

function GalleryVideo({ src, poster, alt }: { src: string; poster: string; alt: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  return <div className="product-media-video"><video ref={video} src={src} poster={poster} controls muted playsInline preload="none" aria-label={alt} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />{!playing && <button type="button" className="product-media-play" onClick={() => void video.current?.play()} aria-label="Play product film">▶</button>}<span>IGNYTE BRAND FILM</span></div>;
}

export default function ProductGallery({ product }: { product: Product }) {
  const media = [
    { kind: "image" as const, src: product.image, alt: `${product.name} in ${product.color}` },
    ...product.gallery.map(photo => ({ kind: "image" as const, src: photo.image, alt: photo.alt })),
    ...(product.pdp.video_url ? [{ kind: "video" as const, src: product.pdp.video_url, alt: "Ignyte training film" }] : []),
  ];
  const [selected, setSelected] = useState(0);
  const touchStart = useRef<number | null>(null);
  const current = selected % media.length;
  const visible = media.length > 1 ? [media[current], media[(current + 1) % media.length]] : [media[0]];
  const move = (direction: number) => setSelected(index => (index + direction + media.length) % media.length);

  return <section className="product-media" aria-label={`${product.name} media gallery`}>
    <div className={`product-media-stage ${visible.length === 1 ? "single" : ""}`}
      onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={event => { if (touchStart.current === null || event.target instanceof HTMLVideoElement) return; const delta = event.changedTouches[0]?.clientX - touchStart.current; if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1); touchStart.current = null; }}>
      {visible.map((item, index) => item.kind === "video" ? <GalleryVideo key={`${item.src}-${index}`} src={item.src} poster={product.pdp.video_poster} alt={item.alt} /> : <img key={`${item.src}-${index}`} src={item.src} alt={item.alt} loading={index === 0 ? "eager" : "lazy"} />)}
    </div>
    {media.length > 2 && <div className="product-media-navigation">
      <div className="product-media-heading"><span>EXPLORE THE DETAILS</span><span aria-live="polite">{String(current + 1).padStart(2, "0")} / {String(media.length).padStart(2, "0")}</span></div>
      <div className="product-media-controls">
        <button type="button" className="product-media-arrow" onClick={() => move(-1)} aria-label="Previous product media">←</button>
        <div className="product-media-thumbnails" aria-label="Choose product media">
          {media.map((item, index) => <button type="button" key={`${item.src}-${index}`} className={index === current ? "selected" : ""} onClick={() => setSelected(index)} aria-label={`Show ${item.kind === "video" ? "film" : "photo"} ${index + 1} of ${media.length}`} aria-current={index === current ? "true" : undefined}>
            <img src={item.kind === "video" ? product.pdp.video_poster || product.image : item.src} alt="" loading="lazy" />{item.kind === "video" && <span aria-hidden="true">▶</span>}
          </button>)}
        </div>
        <button type="button" className="product-media-arrow" onClick={() => move(1)} aria-label="Next product media">→</button>
      </div>
    </div>}
  </section>;
}
