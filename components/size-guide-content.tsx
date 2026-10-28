"use client";

import Link from "next/link";
import { useState } from "react";
import { guideCategoryForProduct, sizeGuides, type SizeGuideCategory } from "@/data/size-guide";
import "@/app/size-guide/size-guide.css";

const guideOrder: SizeGuideCategory[] = ["sports-bras", "bottoms", "tops", "socks"];

export default function SizeGuideContent({ productCategory, showTabs = false }: { productCategory?: string; showTabs?: boolean }) {
  const [activeTab, setActiveTab] = useState<SizeGuideCategory>("sports-bras");
  const category = showTabs ? activeTab : guideCategoryForProduct(productCategory ?? "sports-bras");
  const guide = sizeGuides[category];
  const hasRanges = guide.rows.some(row => guide.sizes.some(size => Boolean(row.ranges[size])));

  return <div className="size-guide-content">
    {showTabs && <div className="size-guide-tabs" aria-label="Choose size guide category">
      {guideOrder.map(key => <button type="button" key={key} className={category === key ? "selected" : ""} aria-pressed={category === key} onClick={() => setActiveTab(key)}>{sizeGuides[key].label.toUpperCase()}</button>)}
    </div>}
    <h3>{guide.label} size guide</h3>
    {guide.note ? <p>{guide.note}</p> : <>
      {hasRanges ? <div className="size-guide-scroll"><table><caption>Body measurement ranges · cm</caption><thead><tr><th scope="col">Measurement</th>{guide.sizes.map(size => <th scope="col" key={size}>{size}</th>)}</tr></thead><tbody>{guide.rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th>{guide.sizes.map(size => <td key={size}>{row.ranges[size] || "—"}</td>)}</tr>)}</tbody></table></div>
        : <p className="size-guide-help">Detailed size ranges for {guide.label.toLowerCase()} will be added soon. <Link href="/contact">Contact us</Link> for fit advice before ordering.</p>}
      <p>Use a soft measuring tape and keep it level without pulling tight. Fit can vary by style.</p>
      <ul>{guide.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>
    </>}
  </div>;
}
