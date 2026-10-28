"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";

type Photo = { image: string; alt: string };

export default function ProductPhotoLightbox({ photos, initialIndex, onClose }: { photos: Photo[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "ArrowRight") changePhoto(1);
      if (event.key === "ArrowLeft") changePhoto(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [photos.length]);

  function changePhoto(direction: number) {
    setIndex(current => (current + direction + photos.length) % photos.length);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function changeZoom(next: number) {
    const value = Math.max(1, Math.min(4, next));
    setZoom(value);
    if (value === 1) setPan({ x: 0, y: 0 });
  }

  function startDrag(event: ReactPointerEvent<HTMLImageElement>) {
    if (zoom === 1) return;
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: ReactPointerEvent<HTMLImageElement>) {
    if (!drag.current) return;
    setPan({ x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y });
  }

  function wheelZoom(event: ReactWheelEvent<HTMLImageElement>) {
    event.preventDefault();
    changeZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25));
  }

  return <div className="pdp-zoom-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="pdp-zoom-dialog" role="dialog" aria-modal="true" aria-label="Product photo viewer">
      <div className="pdp-zoom-toolbar">
        <span>{index + 1} / {photos.length}</span>
        <div className="pdp-zoom-actions">
          <button type="button" onClick={() => changeZoom(zoom - 0.5)} disabled={zoom === 1} aria-label="Zoom out">−</button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => changeZoom(zoom + 0.5)} disabled={zoom === 4} aria-label="Zoom in">＋</button>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Close photo viewer">×</button>
        </div>
      </div>
      <div className="pdp-zoom-stage">
        {photos.length > 1 && <button type="button" className="pdp-zoom-prev" onClick={() => changePhoto(-1)} aria-label="Previous photo">←</button>}
        <img src={photos[index].image} alt={photos[index].alt} draggable={false} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, cursor: zoom > 1 ? "grab" : "zoom-in" }} onClick={() => { if (zoom === 1) changeZoom(2); }} onWheel={wheelZoom} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} />
        {photos.length > 1 && <button type="button" className="pdp-zoom-next" onClick={() => changePhoto(1)} aria-label="Next photo">→</button>}
      </div>
      <p>Tap the photo or use + to zoom. Drag to inspect details.</p>
    </div>
  </div>;
}
