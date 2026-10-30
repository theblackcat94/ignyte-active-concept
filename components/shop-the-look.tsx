"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { money } from "@/lib/catalog";
import { compareProductColours, productColourHex } from "@/lib/product-colors";
import { useStore } from "./store-provider";
import "./shop-the-look.css";

type Look = { title: string; description: string; eyebrow: string; top: string; bottom: string };
const looks: Look[] = [
  { title: "The studio set", description: "Soft colour, strong intent.", eyebrow: "CURATED TO MOVE_", top: "seamless-sports-bra-jacaranda", bottom: "seamless-legging-lavender" },
  { title: "The training edit", description: "Ready for every round.", eyebrow: "TWO PIECES. ONE LOOK.", top: "motion-sports-bra-black", bottom: "all-in-motion-shorts-black" },
];

function LookCard({ look, products }: { look: Look; products: Product[] }) {
  const { addSetToBag, bag, catalogLoading, catalogError } = useStore();
  const [topSlug, setTopSlug] = useState(look.top);
  const [bottomSlug, setBottomSlug] = useState(look.bottom);
  const [topSize, setTopSize] = useState("");
  const [bottomSize, setBottomSize] = useState("");
  const [feedback, setFeedback] = useState("");
  const top = products.find(item => item.slug === topSlug) ?? products.find(item => item.slug === look.top);
  const bottom = products.find(item => item.slug === bottomSlug) ?? products.find(item => item.slug === look.bottom);
  if (!top || !bottom) return null;
  const validSize = (item: Product, selected: string) => item.variants?.find(v => v.size === selected && v.stock > 0) ? selected : item.variants?.length === 1 && item.variants[0].stock > 0 ? item.variants[0].size : "";
  const selectedTopSize = validSize(top, topSize);
  const selectedBottomSize = validSize(bottom, bottomSize);
  const topVariant = top.variants?.find(variant => variant.size === selectedTopSize);
  const bottomVariant = bottom.variants?.find(variant => variant.size === selectedBottomSize);
  const topPrice = topVariant?.price ?? top.price;
  const bottomPrice = bottomVariant?.price ?? bottom.price;
  const atBagLimit = (item: Product, selected: string) => {
    const variant = item.variants?.find(value => value.size === selected);
    return Boolean(variant && (bag.find(entry => entry.slug === item.slug && entry.size === selected)?.quantity ?? 0) >= variant.stock);
  };
  const addLook = () => {
    if (!selectedTopSize) { setFeedback(`Choose an available size for ${top.name}.`); return; }
    if (!selectedBottomSize) { setFeedback(`Choose an available size for ${bottom.name}.`); return; }
    if (atBagLimit(top, selectedTopSize) || atBagLimit(bottom, selectedBottomSize)) { setFeedback("The selected size is already at its available quantity in your bag."); return; }
    if (!addSetToBag(top.slug, selectedTopSize, bottom.slug, selectedBottomSize)) setFeedback("The set could not be added. Please check your selections and try again.");
    else setFeedback("");
  };
  const selectTopColour = (slug: string) => {
    const next = products.find(item => item.slug === slug);
    if (!next) return;
    setTopSlug(slug);
    if (!next.variants?.some(variant => variant.size === topSize && variant.stock > 0)) setTopSize("");
    const matchingBottom = products.find(item => item.name === bottom.name && item.category === bottom.category && item.color.toLowerCase() === next.color.toLowerCase());
    if (matchingBottom) {
      setBottomSlug(matchingBottom.slug);
      if (!matchingBottom.variants?.some(variant => variant.size === bottomSize && variant.stock > 0)) setBottomSize("");
    }
  };
  const selectBottomColour = (slug: string) => {
    const next = products.find(item => item.slug === slug);
    if (!next) return;
    setBottomSlug(slug);
    if (!next.variants?.some(variant => variant.size === bottomSize && variant.stock > 0)) setBottomSize("");
    const matchingTop = products.find(item => item.name === top.name && item.category === top.category && item.color.toLowerCase() === next.color.toLowerCase());
    if (matchingTop) {
      setTopSlug(matchingTop.slug);
      if (!matchingTop.variants?.some(variant => variant.size === topSize && variant.stock > 0)) setTopSize("");
    }
  };
  const renderProduct = (item: Product, selectedSize: string, onSize: (size: string) => void, onColour: (slug: string) => void) => {
    const colours = products.filter(option => option.name === item.name && option.category === item.category).sort((a, b) => compareProductColours(a.color, b.color));
    return <div className="look-product" key={item.slug}>
      <div className="look-product-detail"><img src={item.image} alt={`${item.name} in ${item.color}`} loading="lazy" /><div><div className="look-product-heading"><Link href={`/product/${item.slug}/`}>{item.name} · {item.color}</Link><strong>{money(item.variants?.find(v => v.size === selectedSize)?.price ?? item.price)}</strong></div>
      <div className="look-options"><div className="look-colours" aria-label={`${item.name} colour`}>{colours.map(option => <button key={option.slug} type="button" className={option.slug === item.slug ? "selected" : ""} style={{ backgroundColor: productColourHex(option.color) ?? "#d3cdc9" }} aria-label={`${option.color}${option.slug === item.slug ? ", selected" : ""}`} aria-pressed={option.slug === item.slug} onClick={() => { setFeedback(""); onColour(option.slug); }} />)}</div><div className="look-sizes" aria-label={`${item.name} size`}>{item.variants?.map(variant => <button type="button" key={variant.id} disabled={variant.stock <= 0} aria-pressed={selectedSize === variant.size} onClick={() => { setFeedback(""); onSize(variant.size); }}>{variant.size}</button>)}</div></div></div>
    </div></div>;
  };
  return <article className="look-card">
    <Link href={`/product/${top.slug}/`} className="look-image" aria-label={`View ${look.title}`}><img className="look-image-primary" src={top.gallery[0]?.image ?? top.image} alt={`${top.name} and coordinated bottoms in ${top.color}`} loading="lazy" /><img className="look-image-secondary" src={top.gallery[1]?.image ?? top.gallery[0]?.image ?? top.image} alt="" aria-hidden="true" loading="lazy" /></Link>
    <div className="look-card-content"><span className="home-kicker">{look.eyebrow}</span><h3>{look.title}</h3><p>{look.description}</p>
      {renderProduct(top, selectedTopSize, setTopSize, selectTopColour)}
      {renderProduct(bottom, selectedBottomSize, setBottomSize, selectBottomColour)}
      <div className="look-total"><span>SET TOTAL · ITEMS PRICED SEPARATELY</span><strong>{money(topPrice + bottomPrice)}</strong></div>
      <button type="button" className="button button-orange look-add" disabled={catalogLoading || Boolean(catalogError)} onClick={addLook}>ADD SET TO BAG <span>↗</span></button>
      <small role="status" aria-live="polite">{feedback || (catalogLoading ? "Checking stock…" : catalogError ? "Stock is temporarily unavailable." : "Choose an available size for each piece.")}</small>
    </div>
  </article>;
}

export default function ShopTheLook({ products }: { products: Product[] }) {
  return <section className="home-shop-look home-container" aria-labelledby="shop-look-title"><div className="home-section-head"><h2 id="shop-look-title" className="mono-section-heading">SHOP THE LOOK_</h2></div><div className="look-grid">{looks.map(look => <LookCard key={look.title} look={look} products={products} />)}</div></section>;
}
