"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";

export default function ProductGallery({ product }: { product: Product }) {
  const photos = [
    { image: product.image, alt: `${product.name} in ${product.color}` },
    ...product.gallery,
  ];
  const [selected, setSelected] = useState(0);
  const current = selected % photos.length;
  const visible = photos.length > 1 ? [photos[current], photos[(current + 1) % photos.length]] : [photos[0]];
  const move = (direction: number) => setSelected(index => (index + direction + photos.length) % photos.length);

  return <section className="product-media" aria-label={`${product.name} photo gallery`}>
    <div className={`product-media-stage ${visible.length === 1 ? "single" : ""}`}>
      {visible.map((photo, index) => <img
        key={`${photo.image}-${index}`}
        src={photo.image}
        alt={photo.alt}
        loading={index === 0 ? "eager" : "lazy"}
      />)}
    </div>
    {photos.length > 2 && <div className="product-media-navigation">
      <div className="product-media-heading"><span>EXPLORE THE DETAILS</span><span aria-live="polite">{String(current + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</span></div>
      <div className="product-media-controls">
        <button type="button" className="product-media-arrow" onClick={() => move(-1)} aria-label="Previous product photo">←</button>
        <div className="product-media-thumbnails" aria-label="Choose a product photo">
          {photos.map((photo, index) => <button
            type="button"
            key={photo.image}
            className={index === current ? "selected" : ""}
            onClick={() => setSelected(index)}
            aria-label={`Show product photo ${index + 1} of ${photos.length}`}
            aria-current={index === current ? "true" : undefined}
          ><img src={photo.image} alt="" loading="lazy" /></button>)}
        </div>
        <button type="button" className="product-media-arrow" onClick={() => move(1)} aria-label="Next product photo">→</button>
      </div>
    </div>}
  </section>;
}
