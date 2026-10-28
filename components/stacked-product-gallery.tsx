"use client";

import { useRef, useState } from "react";
import type { Product } from "@/lib/catalog";
import ProductPhotoLightbox from "./product-photo-lightbox";
import "@/app/pdp-stack-preview.css";

export default function StackedProductGallery({ product }: { product: Product }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const photos = [
    { image: product.image, alt: `${product.name} in ${product.color}` },
    ...product.gallery,
  ];
  const mediaCount = photos.length + (product.pdp.video_url ? 1 : 0);

  function updateActiveIndex() {
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
    grid.scrollTo({ left: target.offsetLeft - first.offsetLeft, behavior: "smooth" });
    setActiveIndex(index);
  }

  return <section className="pdp-stack-media" aria-label={`${product.name} stacked media gallery`}>
    <div className="pdp-stack-grid" ref={gridRef} onScroll={updateActiveIndex}>
      {photos.map((photo, index) => <figure className="pdp-stack-tile" key={`${photo.image}-${index}`}>
        <button type="button" className="pdp-stack-photo" onClick={() => setOpenIndex(index)} aria-label={`Enlarge photo ${index + 1} of ${photos.length}: ${photo.alt}`}>
          <img src={photo.image} alt={photo.alt} loading={index === 0 ? "eager" : "lazy"} />
          <span className="pdp-stack-zoom-cue" aria-hidden="true"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></span>
        </button>
      </figure>)}
      {product.pdp.video_url && <figure className="pdp-stack-tile pdp-stack-video">
        <video src={product.pdp.video_url} poster={product.pdp.video_poster} controls playsInline preload="none" aria-label={`${product.name} product film`} />
        <figcaption>IGNYTE FILM</figcaption>
      </figure>}
    </div>
    {mediaCount > 1 && <nav className="pdp-stack-pagination" aria-label="Product media slides">
      {Array.from({ length: mediaCount }, (_, index) => <button key={index} type="button" className={activeIndex === index ? "active" : ""} aria-label={`Show ${index === photos.length ? "product film" : `photo ${index + 1}`} of ${mediaCount}`} aria-current={activeIndex === index ? "true" : undefined} onClick={() => goToMedia(index)}><span /></button>)}
    </nav>}
    {openIndex !== null && <ProductPhotoLightbox photos={photos} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />}
  </section>;
}
