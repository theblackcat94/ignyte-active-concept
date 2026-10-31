"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";

type Photo = { image: string; alt: string };

export default function ProductPhotoLightbox({ photos, initialIndex, onClose }: { photos: Photo[]; initialIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; midX: number; midY: number; zoom: number; panX: number; panY: number } | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const closeButton = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "ArrowRight" && zoomRef.current === 1) changePhoto(1);
      if (event.key === "ArrowLeft" && zoomRef.current === 1) changePhoto(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [photos.length]);

  function changePhoto(direction: number) {
    pointers.current.clear();
    pinch.current = null;
    drag.current = null;
    setIndex(current => (current + direction + photos.length) % photos.length);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
  }

  function changeZoom(next: number) {
    const value = Math.max(1, Math.min(4, next));
    setZoom(value);
    zoomRef.current = value;
    if (value === 1) setPan({ x: 0, y: 0 });
  }

  function startDrag(event: ReactPointerEvent<HTMLImageElement>) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2, zoom, panX: pan.x, panY: pan.y };
      drag.current = null;
      return;
    }
    if (zoom === 1) return;
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
  }

  function moveDrag(event: ReactPointerEvent<HTMLImageElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const nextZoom = Math.max(1, Math.min(4, pinch.current.zoom * distance / Math.max(1, pinch.current.distance)));
      const nextPan = nextZoom === 1 ? { x: 0, y: 0 } : { x: pinch.current.panX + (a.x + b.x) / 2 - pinch.current.midX, y: pinch.current.panY + (a.y + b.y) / 2 - pinch.current.midY };
      zoomRef.current = nextZoom;
      panRef.current = nextPan;
      setZoom(nextZoom);
      setPan(nextPan);
      return;
    }
    if (!drag.current) return;
    const nextPan = { x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y };
    panRef.current = nextPan;
    setPan(nextPan);
  }

  function endDrag(event: ReactPointerEvent<HTMLImageElement>) {
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    const remaining = [...pointers.current.values()][0];
    drag.current = remaining && zoomRef.current > 1 ? { x: remaining.x, y: remaining.y, panX: panRef.current.x, panY: panRef.current.y } : null;
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
          <button type="button" onClick={() => changeZoom(1)} disabled={zoom === 1} aria-label="Reset zoom to 100 percent">{Math.round(zoom * 100)}%</button>
          <button type="button" onClick={() => changeZoom(zoom + 0.5)} disabled={zoom === 4} aria-label="Zoom in">＋</button>
          <button ref={closeButton} type="button" onClick={onClose} aria-label="Close photo viewer">×</button>
        </div>
      </div>
      <div className="pdp-zoom-stage">
        {photos.length > 1 && <button type="button" className="pdp-zoom-prev" onClick={() => changePhoto(-1)} disabled={zoom > 1} aria-label="Previous photo">←</button>}
        <img src={photos[index].image} alt={photos[index].alt} draggable={false} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, cursor: zoom > 1 ? "grab" : "zoom-in" }} onClick={() => { if (zoom === 1) changeZoom(2); }} onWheel={wheelZoom} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} />
        {photos.length > 1 && <button type="button" className="pdp-zoom-next" onClick={() => changePhoto(1)} disabled={zoom > 1} aria-label="Next photo">→</button>}
      </div>
      <p>Pinch or tap to zoom. Drag to inspect. Select the percentage to reset.</p>
    </div>
  </div>;
}
