"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { money } from "@/lib/catalog";
import { productColourHex } from "@/lib/product-colors";
import { useStore } from "./store-provider";
import "./shop-the-look.css";

type Look = { title: string; description: string; top: string; bottom: string };
const looks: Look[] = [
  { title: "The studio set", description: "Soft colour, strong intent.", top: "seamless-sports-bra-jacaranda", bottom: "seamless-legging-lavender" },
  { title: "The training edit", description: "Ready for every round.", top: "motion-sports-bra-black", bottom: "all-in-motion-shorts-black" },
];

function LookCard({ look, products }: { look: Look; products: Product[] }) {
  const { addSetToBag, catalogLoading, catalogError } = useStore();
  const [topSlug, setTopSlug] = useState(look.top);
  const [bottomSlug, setBottomSlug] = useState(look.bottom);
  const [topSize, setTopSize] = useState("");
  const [bottomSize, setBottomSize] = useState("");
  const top = products.find(item => item.slug === topSlug) ?? products.find(item => item.slug === look.top);
  const bottom = products.find(item => item.slug === bottomSlug) ?? products.find(item => item.slug === look.bottom);
  if (!top || !bottom) return null;
  const validSize = (item: Product, selected: string) => item.variants?.find(v => v.size === selected && v.stock > 0) ? selected : item.variants?.length === 1 && item.variants[0].stock > 0 ? item.variants[0].size : "";
  const selectedTopSize = validSize(top, topSize);
  const selectedBottomSize = validSize(bottom, bottomSize);
  const canAdd = !catalogLoading && !catalogError && Boolean(selectedTopSize && selectedBottomSize);
  const renderProduct = (item: Product, selectedSize: string, onSize: (size: string) => void, onColour: (slug: string) => void) => {
    const colours = products.filter(option => option.name === item.name && option.category === item.category);
    return <div className="look-product" key={item.slug}>
      <div className="look-product-detail"><img src={item.image} alt={`${item.name} in ${item.color}`} loading="lazy" /><div><div className="look-product-heading"><Link href={`/product/${item.slug}/`}>{item.name} · {item.color}</Link><strong>{money(item.variants?.find(v => v.size === selectedSize)?.price ?? item.price)}</strong></div>
      <div className="look-options"><div className="look-colours" aria-label={`${item.name} colour`}>{colours.map(option => <button key={option.slug} type="button" className={option.slug === item.slug ? "selected" : ""} style={{ backgroundColor: productColourHex(option.color) ?? "#d3cdc9" }} aria-label={`${option.color}${option.slug === item.slug ? ", selected" : ""}`} aria-pressed={option.slug === item.slug} onClick={() => onColour(option.slug)} />)}</div><div className="look-sizes" aria-label={`${item.name} size`}>{item.variants?.map(variant => <button type="button" key={variant.id} disabled={variant.stock <= 0} aria-pressed={selectedSize === variant.size} onClick={() => onSize(variant.size)}>{variant.size}</button>)}</div></div></div>
    </div></div>;
  };
  return <article className="look-card">
    <Link href={`/product/${top.slug}/`} className="look-image" aria-label={`View ${look.title}`}><img src={top.gallery[0]?.image ?? top.image} alt={`${top.name} and coordinated bottoms in ${top.color}`} loading="lazy" /></Link>
    <div className="look-card-content"><span className="home-kicker">CURATED TO MOVE_</span><h3>{look.title}</h3><p>{look.description}</p>
      {renderProduct(top, selectedTopSize, setTopSize, slug => { const next = products.find(item => item.slug === slug); setTopSlug(slug); if (!next?.variants?.some(v => v.size === topSize && v.stock > 0)) setTopSize(""); })}
      {renderProduct(bottom, selectedBottomSize, setBottomSize, slug => { const next = products.find(item => item.slug === slug); setBottomSlug(slug); if (!next?.variants?.some(v => v.size === bottomSize && v.stock > 0)) setBottomSize(""); })}
      <button type="button" className="button button-orange look-add" disabled={!canAdd} onClick={() => addSetToBag(top.slug, selectedTopSize, bottom.slug, selectedBottomSize)}>SHOP THE LOOK <span>↗</span></button>
      <small>Two pieces, priced separately. Choose an available size for each.</small>
    </div>
  </article>;
}

export default function ShopTheLook({ products }: { products: Product[] }) {
  return <section className="home-shop-look home-container" aria-labelledby="shop-look-title"><div className="home-section-head"><h2 id="shop-look-title" className="mono-section-heading">SHOP THE LOOK_</h2></div><div className="look-grid">{looks.map(look => <LookCard key={look.title} look={look} products={products} />)}</div></section>;
}
