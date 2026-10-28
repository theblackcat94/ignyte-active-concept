"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import ProductPhotoLightbox from "./product-photo-lightbox";
import "@/app/pdp-stack-preview.css";

export default function StackedProductGallery({ product }: { product: Product }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const photos = [
    { image: product.image, alt: `${product.name} in ${product.color}` },
    ...product.gallery,
  ];

  return <section className="pdp-stack-media" aria-label={`${product.name} stacked media gallery`}>
    <div className="pdp-stack-grid">
      {photos.map((photo, index) => <figure className="pdp-stack-tile" key={`${photo.image}-${index}`}>
        <button type="button" className="pdp-stack-photo" onClick={() => setOpenIndex(index)} aria-label={`Enlarge photo ${index + 1} of ${photos.length}: ${photo.alt}`}>
          <img src={photo.image} alt={photo.alt} loading={index === 0 ? "eager" : "lazy"} />
          <span className="pdp-stack-zoom-cue" aria-hidden="true">＋</span>
        </button>
      </figure>)}
      {product.pdp.video_url && <figure className="pdp-stack-tile pdp-stack-video">
        <video src={product.pdp.video_url} poster={product.pdp.video_poster} controls playsInline preload="none" aria-label={`${product.name} product film`} />
        <figcaption>IGNYTE FILM</figcaption>
      </figure>}
    </div>
    <p className="pdp-stack-swipe">SWIPE TO EXPLORE MEDIA <span aria-hidden="true">↔</span></p>
    {openIndex !== null && <ProductPhotoLightbox photos={photos} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />}
  </section>;
}
