"use client";

import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/catalog";
import ProductCard from "./product-card";

export default function HomeProductCarousel({ products, label }: { products: Product[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => {
      setCanBack(element.scrollLeft > 2);
      setCanForward(element.scrollLeft + element.clientWidth < element.scrollWidth - 2);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [products]);

  const move = (direction: number) => track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.8, behavior: "smooth" });
  return <div className="home-product-carousel">
    <div className="home-product-track" ref={track} role="region" aria-label={label} tabIndex={0}>
      {products.map((product, index) => <ProductCard key={product.slug} product={product} index={index} showOptions />)}
    </div>
    <div className="home-product-controls"><button type="button" onClick={() => move(-1)} disabled={!canBack} aria-label={`Previous ${label}`}>←</button><button type="button" onClick={() => move(1)} disabled={!canForward} aria-label={`Next ${label}`}>→</button></div>
  </div>;
}
