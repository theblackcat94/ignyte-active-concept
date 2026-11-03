"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

type Point = { x: number; y: number };
const distance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
const midpoint = (a: Touch, b: Touch): Point => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

export default function PdpPinchPhoto({ src, alt, index, total, active, onOpen }: { src: string; alt: string; index: number; total: number; active: boolean; onOpen: () => void }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const button = buttonRef.current;
    const image = imageRef.current;
    if (!button || !image) return;
    let scale = 1;
    let x = 0;
    let y = 0;
    let startScale = 1;
    let startDistance = 1;
    let lastPoint: Point | null = null;
    let pinching = false;

    const paint = () => {
      const bounds = button.getBoundingClientRect();
      const maxX = (bounds.width * (scale - 1)) / 2;
      const maxY = (bounds.height * (scale - 1)) / 2;
      x = Math.max(-maxX, Math.min(maxX, x));
      y = Math.max(-maxY, Math.min(maxY, y));
      image.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`;
      button.classList.toggle("is-pinched", scale > 1.01);
    };
    const reset = () => { scale = 1; x = 0; y = 0; pinching = false; lastPoint = null; paint(); };
    const start = (event: TouchEvent) => {
      if (!window.matchMedia("(max-width: 900px)").matches) return;
      if (event.touches.length === 2) {
        pinching = true;
        suppressClick.current = true;
        startScale = scale;
        startDistance = distance(event.touches[0], event.touches[1]) || 1;
        lastPoint = midpoint(event.touches[0], event.touches[1]);
        event.preventDefault();
      } else if (scale > 1.01 && event.touches.length === 1) {
        lastPoint = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        suppressClick.current = true;
        event.preventDefault();
      }
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length === 2 && pinching) {
        event.preventDefault();
        const point = midpoint(event.touches[0], event.touches[1]);
        if (lastPoint) { x += point.x - lastPoint.x; y += point.y - lastPoint.y; }
        lastPoint = point;
        scale = Math.max(1, Math.min(4, startScale * distance(event.touches[0], event.touches[1]) / startDistance));
        if (scale < 1.04) { scale = 1; x = 0; y = 0; }
        paint();
      } else if (event.touches.length === 1 && scale > 1.01) {
        event.preventDefault();
        const point = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        if (lastPoint) { x += point.x - lastPoint.x; y += point.y - lastPoint.y; paint(); }
        lastPoint = point;
      }
    };
    const end = (event: TouchEvent) => {
      if (event.touches.length === 1 && pinching) lastPoint = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      else if (!event.touches.length) { pinching = false; lastPoint = null; if (scale <= 1.01) reset(); window.setTimeout(() => { suppressClick.current = false; }, 400); }
    };
    button.addEventListener("touchstart", start, { passive: false });
    button.addEventListener("touchmove", move, { passive: false });
    button.addEventListener("touchend", end);
    button.addEventListener("touchcancel", reset);
    if (!active) reset();
    return () => {
      button.removeEventListener("touchstart", start);
      button.removeEventListener("touchmove", move);
      button.removeEventListener("touchend", end);
      button.removeEventListener("touchcancel", reset);
      reset();
    };
  }, [src, active]);

  return <button ref={buttonRef} type="button" className="pdp-stack-photo" onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onOpen(); }} aria-label={`Enlarge photo ${index + 1} of ${total}: ${alt}`}>
    <Image ref={imageRef} src={src} alt={alt} fill sizes="(max-width: 900px) 100vw, (max-width: 1400px) 36vw, 31vw" loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} draggable={false} />
    <span className="pdp-stack-zoom-cue" aria-hidden="true"><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg></span>
  </button>;
}
