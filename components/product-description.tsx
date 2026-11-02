"use client";
import { useEffect, useId, useRef, useState } from "react";

export default function ProductDescription({ description }: { description: string }) {
  const id = useId();
  const textRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState({ collapsed: 0, full: 0, long: false });
  useEffect(() => {
    const text = textRef.current;
    if (!text) return;
    const measure = () => {
      const line = Number.parseFloat(getComputedStyle(text).lineHeight);
      const collapsed = line * 3;
      const full = text.scrollHeight;
      setHeight(current => current.collapsed === collapsed && current.full === full ? current : { collapsed, full, long: full > collapsed + 1 });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(text.parentElement ?? text);
    measure();
    return () => observer.disconnect();
  }, [description]);
  return <div className="pdp-description">
    <p id={id} ref={textRef} className="detail-description" style={height.collapsed ? { maxHeight: expanded ? height.full : height.collapsed } : undefined}>{description}</p>
    {height.long && <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)}>{expanded ? "Read Less" : "Read More"}</button>}
  </div>;
}
