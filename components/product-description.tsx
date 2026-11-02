"use client";
import { useLayoutEffect, useRef, useState } from "react";

export default function ProductDescription({ description }: { description: string }) {
  const measureRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [limit, setLimit] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = measureRef.current;
    const wrapper = measure?.parentElement;
    const text = measure?.querySelector("span");
    const action = measure?.querySelector("button");
    if (!measure || !wrapper || !text || !action) return;
    const update = () => {
      const lineHeight = Number.parseFloat(getComputedStyle(measure).lineHeight);
      const twoLines = lineHeight * 2 + 1;
      text.textContent = description;
      action.hidden = true;
      if (measure.scrollHeight <= twoLines) {
        setLimit(current => current === null ? current : null);
        return;
      }
      action.hidden = false;
      let low = 0;
      let high = description.length;
      while (low < high) {
        const middle = Math.ceil((low + high) / 2);
        text.textContent = `${description.slice(0, middle).trimEnd()}… `;
        if (measure.scrollHeight <= twoLines) low = middle;
        else high = middle - 1;
      }
      const wordEnd = description.lastIndexOf(" ", low);
      const next = wordEnd > low - 20 ? wordEnd : low;
      setLimit(current => current === next ? current : next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(wrapper);
    update();
    return () => observer.disconnect();
  }, [description]);
  const collapsed = limit !== null && !expanded;
  return <div className="pdp-description">
    <p className="detail-description pdp-description-text">
      {collapsed ? <><span aria-hidden="true">{description.slice(0, limit).trimEnd()}… </span><span className="pdp-description-sr-only">{description}</span></> : <span>{description} </span>}
      {limit !== null && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Read less" : "Read more"}</button>}
    </p>
    <p ref={measureRef} className="detail-description pdp-description-measure" aria-hidden="true"><span>{description}</span><button type="button" tabIndex={-1}>Read more</button></p>
  </div>;
}
