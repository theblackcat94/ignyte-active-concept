"use client";

import Link from "next/link";
import { useState } from "react";
import { CurrencyEstimate } from "./currency-estimate";
import { type Product, money } from "@/lib/catalog";
import { commerceConfigured } from "@/lib/commerce";
import { compareProductColours, productColourHex } from "@/lib/product-colors";
import { useStore } from "./store-provider";
import HeartIcon from "./heart-icon";
import "@/app/product-card.css";
import { showBestSellerBadges, showNewProductBadges } from "@/data/storefront-flags";

export default function ProductCard({ product, index = 0, showOptions = false }: { product: Product; index?: number; showOptions?: boolean }) {
  const { products, wishlist, toggleWishlist, addToBag, catalogLoading, catalogError } = useStore();
  const [selectedSlug, setSelectedSlug] = useState(product.slug);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSize, setQuickSize] = useState("");
  const colours = showOptions ? products.filter(item => item.name === product.name && item.category === product.category).sort((a, b) => compareProductColours(a.color, b.color)) : [product];
  const displayed = colours.find(item => item.slug === selectedSlug) ?? product;
  const liked = wishlist.includes(displayed.slug);
  const sizes = displayed.variants ?? (commerceConfigured ? [] : ["S", "M", "L"].map(size => ({ id: size, size, price: displayed.price, stock: 1 })));
  const hasStock = sizes.some(variant => variant.stock > 0);
  const chosenSize = (sizes.some(variant => variant.size === quickSize && variant.stock > 0) ? quickSize : "") || (sizes.length === 1 && sizes[0].stock > 0 ? sizes[0].size : "");
  const selected = sizes.find(variant => variant.size === chosenSize);
  const changeColour = (slug: string) => { setSelectedSlug(slug); setQuickSize(""); setQuickOpen(false); };
  return <article className={`product-card${showOptions ? " product-card-options" : ""}`} style={{ animationDelay: `${index * 65}ms` }}>
    <div className="product-image"><Link className="product-image-link" href={`/product/${displayed.slug}`} aria-label={`View ${displayed.name} in ${displayed.color}`}><img className="product-image-primary" src={displayed.image} alt={`${displayed.name} in ${displayed.color}`} loading="lazy" draggable={false} />{displayed.gallery[0] && <img className="product-image-hover" src={displayed.gallery[0].image} alt="" loading="lazy" draggable={false} />}</Link>{displayed.label && displayed.label.toLowerCase() !== "popular" && (displayed.label.toLowerCase() !== "new" || showNewProductBadges) && (displayed.label.toLowerCase() !== "best seller" || showBestSellerBadges) && <span className="product-badge">{displayed.label}</span>}<button className={`product-heart ${liked ? "liked" : ""}`} aria-label={liked ? "Remove from wishlist" : "Add to wishlist"} onClick={() => toggleWishlist(displayed.slug)}><HeartIcon filled={liked} /></button>
      {quickOpen ? <div className="quick-add-panel"><div className="quick-add-heading"><span>CHOOSE SIZE</span><button type="button" onClick={() => setQuickOpen(false)} aria-label="Close size picker">×</button></div><div className="quick-add-sizes">{sizes.map(variant => <button type="button" key={variant.id} disabled={variant.stock <= 0} aria-label={`${variant.size}${variant.stock <= 0 ? ", out of stock" : ""}`} aria-pressed={chosenSize === variant.size} className={chosenSize === variant.size ? "selected" : ""} onClick={() => setQuickSize(variant.size)}>{variant.size}</button>)}</div><button type="button" className="quick-add-confirm" disabled={!selected || selected.stock <= 0} onClick={() => { addToBag(displayed.slug, chosenSize); setQuickOpen(false); setQuickSize(""); }}>ADD TO BAG <span>↗</span></button></div>
        : <button type="button" className="quick-add" disabled={catalogLoading || catalogError || !hasStock} aria-expanded={false} onClick={() => setQuickOpen(true)}>{catalogLoading ? "CHECKING STOCK" : catalogError ? "STOCK UNAVAILABLE" : hasStock ? "QUICK ADD — CHOOSE SIZE" : "SOLD OUT"} <span>↗</span></button>}
    </div>
    {showOptions && <div className="product-card-colours" aria-label={`Choose ${product.name} colour`}><span>COLOUR <strong>{displayed.color}</strong></span><div className="product-card-swatches">{colours.map(item => <button type="button" key={item.slug} className={item.slug === displayed.slug ? "selected" : ""} aria-pressed={item.slug === displayed.slug} aria-label={`${item.color}${!catalogLoading && item.variants && !item.variants.some(variant => variant.stock > 0) ? ", sold out" : ""}`} onClick={() => changeColour(item.slug)}><span style={{ backgroundColor: productColourHex(item.color) ?? "#D6D1CB" }} /></button>)}</div></div>}
    <div className="product-meta"><span>{displayed.category.replace("-", " ").toUpperCase()}</span>{!showOptions && <span>{displayed.color.toUpperCase()}</span>}</div>
    <div className="product-name"><Link href={`/product/${displayed.slug}`}>{displayed.name}</Link><span className={displayed.originalPrice ? "sale-price" : ""}>{displayed.originalPrice && <del>{money(displayed.originalPrice)}</del>}<strong>{money(displayed.price)}</strong><CurrencyEstimate aud={displayed.price} /></span></div>
  </article>;
}
