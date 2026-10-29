"use client";

import { useState } from "react";
import { money, type Product } from "@/lib/catalog";
import { pairedProducts } from "@/lib/product-merchandising";
import { useStore } from "./store-provider";
import "@/app/build-your-set.css";

export default function BuildYourSet({ bra, braSize }: { bra: Product; braSize: string }) {
  const { products, bag, addSetToBag } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [choice, setChoice] = useState<{ braSlug: string; bottomSlug: string; size: string }>({ braSlug: bra.slug, bottomSlug: "", size: "" });
  if (bra.category !== "sports-bras") return null;
  const bottoms = pairedProducts(bra.slug, products, "related")
    .filter(item => (item.category === "shorts" || item.category === "leggings") && item.color.toLowerCase() === bra.color.toLowerCase());
  if (!bottoms.length) return null;
  const bottom = bottoms.find(item => item.slug === choice.bottomSlug) ?? bottoms[0];
  const variants = bottom.variants ?? [];
  const bottomSize = choice.braSlug === bra.slug && choice.bottomSlug === bottom.slug &&
    variants.some(item => item.size === choice.size && item.stock > 0)
    ? choice.size : variants.length === 1 && variants[0].stock > 0 ? variants[0].size : "";
  const braVariant = bra.variants?.find(item => item.size === braSize && item.stock > 0);
  const bottomVariant = variants.find(item => item.size === bottomSize);
  const braPrice = braVariant?.price ?? bra.price;
  const bottomPrice = bottomVariant?.price ?? bottom.price;
  const hasStock = (slug: string, size: string, stock: number) =>
    (bag.find(item => item.slug === slug && item.size === size)?.quantity ?? 0) < stock;
  const ready = Boolean(braVariant && bottomVariant && hasStock(bra.slug, braSize, braVariant.stock) && hasStock(bottom.slug, bottomSize, bottomVariant.stock));

  return <section className="build-set" aria-labelledby="build-set-title">
    <button type="button" className="build-set-toggle" aria-expanded={expanded} aria-controls="build-set-content" onClick={() => setExpanded(value => !value)}><span id="build-set-title">COMPLETE THE LOOK</span><span aria-hidden="true">{expanded ? "−" : "+"}</span></button>
    {expanded && <div id="build-set-content"><div className="build-set-heading"><div><h2>Build your set.</h2></div><p>Choose one matching bottom. Each piece is priced separately.</p></div>
    <div className="build-set-items"><div className="build-set-item"><img src={bra.image} alt="" /><div><strong>{bra.name}</strong><span>{bra.color} / {braSize || "Choose bra size above"}</span></div><b>{money(braPrice)}</b></div>
      <div className="build-set-choice" role="group" aria-label="Choose matching bottom">{bottoms.map(item => <button key={item.slug} type="button" aria-pressed={item.slug === bottom.slug} onClick={() => setChoice({ braSlug: bra.slug, bottomSlug: item.slug, size: "" })}>{item.name}</button>)}</div>
      <div className="build-set-item"><img src={bottom.image} alt="" /><div><strong>{bottom.name}</strong><span>{bottom.color}</span></div><b>{money(bottomPrice)}</b></div>
    </div>
    <div className="build-set-size"><span>SELECT BOTTOM SIZE</span><div role="group" aria-label={`${bottom.name} size`}>{variants.map(item => <button key={item.id} type="button" disabled={item.stock <= 0} aria-pressed={bottomSize === item.size} onClick={() => setChoice({ braSlug: bra.slug, bottomSlug: bottom.slug, size: item.size })}>{item.size}</button>)}</div></div>
    <div className="build-set-total"><span>SET TOTAL</span><strong>{money(braPrice + bottomPrice)}</strong></div>
    <button type="button" className="build-set-add" disabled={!ready} onClick={() => addSetToBag(bra.slug, braSize, bottom.slug, bottomSize)}>ADD SET TO BAG <span>↗</span></button>
    {!braSize && <p className="build-set-hint">Choose your bra size above to add the set.</p>}</div>}
  </section>;
}
