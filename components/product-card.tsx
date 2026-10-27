"use client";

import Link from "next/link";
import { type Product, money } from "@/lib/catalog";
import { useStore } from "./store-provider";

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const { wishlist, toggleWishlist, addToBag } = useStore();
  const liked = wishlist.includes(product.slug);
  return <article className="product-card" style={{ animationDelay: `${index * 65}ms` }}>
    <div className="product-image"><Link href={`/product/${product.slug}`} aria-label={`View ${product.name}`}><img src={product.image} alt={`${product.name} in ${product.color}`} loading="lazy" /></Link>{product.label && <span className="product-badge">{product.label}</span>}<button className={`product-heart ${liked ? "liked" : ""}`} aria-label={liked ? "Remove from wishlist" : "Add to wishlist"} onClick={() => toggleWishlist(product.slug)}>{liked ? "♥" : "♡"}</button><button className="quick-add" onClick={() => addToBag(product.slug, "M")}>QUICK ADD — M <span>↗</span></button></div>
    <div className="product-meta"><span>{product.category.replace("-", " ").toUpperCase()}</span><span>{product.color.toUpperCase()}</span></div>
    <div className="product-name"><Link href={`/product/${product.slug}`}>{product.name}</Link><strong>{money(product.price)}</strong></div>
  </article>;
}
