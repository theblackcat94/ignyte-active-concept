"use client";

import Link from "next/link";
import { useState } from "react";
import { CurrencyEstimate } from "./currency-estimate";
import { type Product, money } from "@/lib/catalog";
import { commerceConfigured } from "@/lib/commerce";
import { useStore } from "./store-provider";
import HeartIcon from "./heart-icon";
import "@/app/product-card.css";
import { showBestSellerBadges, showNewProductBadges } from "@/data/storefront-flags";

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { wishlist, toggleWishlist, addToBag, catalogLoading, catalogError } = useStore();
  const liked = wishlist.includes(product.slug);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSize, setQuickSize] = useState("");
  const sizes = product.variants ?? (commerceConfigured ? [] : ["S", "M", "L"].map(size => ({ id: size, size, price: product.price, stock: 1 })));
  const hasStock = sizes.some(variant => variant.stock > 0);
  const chosenSize = quickSize || (sizes.length === 1 && sizes[0].stock > 0 ? sizes[0].size : "");
  const selected = sizes.find(variant => variant.size === chosenSize);
  return <article className="product-card" style={{ animationDelay: `${index * 65}ms` }}>
    <div className="product-image"><Link className="product-image-link" href={`/product/${product.slug}`} aria-label={`View ${product.name}`}><img className="product-image-primary" src={product.image} alt={`${product.name} in ${product.color}`} loading="lazy" />{product.gallery[0] && <img className="product-image-hover" src={product.gallery[0].image} alt="" loading="lazy" />}</Link>{product.label && product.label.toLowerCase() !== "popular" && (product.label.toLowerCase() !== "new" || showNewProductBadges) && (product.label.toLowerCase() !== "best seller" || showBestSellerBadges) && <span className="product-badge">{product.label}</span>}<button className={`product-heart ${liked ? "liked" : ""}`} aria-label={liked ? "Remove from wishlist" : "Add to wishlist"} onClick={() => toggleWishlist(product.slug)}><HeartIcon filled={liked} /></button>
      {quickOpen ? <div className="quick-add-panel"><div className="quick-add-heading"><span>CHOOSE SIZE</span><button type="button" onClick={() => setQuickOpen(false)} aria-label="Close size picker">×</button></div><div className="quick-add-sizes">{sizes.map(variant => <button type="button" key={variant.id} disabled={variant.stock <= 0} aria-label={`${variant.size}${variant.stock <= 0 ? ", out of stock" : ""}`} aria-pressed={chosenSize === variant.size} className={chosenSize === variant.size ? "selected" : ""} onClick={() => setQuickSize(variant.size)}>{variant.size}</button>)}</div><button type="button" className="quick-add-confirm" disabled={!selected || selected.stock <= 0} onClick={() => { addToBag(product.slug, chosenSize); setQuickOpen(false); setQuickSize(""); }}>ADD TO BAG <span>↗</span></button></div>
        : <button type="button" className="quick-add" disabled={catalogLoading || catalogError || !hasStock} aria-expanded={false} onClick={() => setQuickOpen(true)}>{catalogLoading ? "CHECKING STOCK" : catalogError ? "STOCK UNAVAILABLE" : hasStock ? "QUICK ADD — CHOOSE SIZE" : "SOLD OUT"} <span>↗</span></button>}
    </div>
    <div className="product-meta"><span>{product.category.replace("-", " ").toUpperCase()}</span><span>{product.color.toUpperCase()}</span></div>
    <div className="product-name"><Link href={`/product/${product.slug}`}>{product.name}</Link><span className={product.originalPrice ? "sale-price" : ""}>{product.originalPrice && <del>{money(product.originalPrice)}</del>}<strong>{money(product.price)}</strong><CurrencyEstimate aud={product.price} /></span></div>
  </article>;
}
