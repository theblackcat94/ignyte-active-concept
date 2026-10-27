"use client";

import Link from "next/link";
import ProductCard from "@/components/product-card";
import { useStore } from "@/components/store-provider";

export default function WishlistPage() {
  const { products, wishlist } = useStore();
  const selected = products.filter(p => wishlist.includes(p.slug));
  return <div className="wishlist-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>WISHLIST</span></div><span className="eyebrow">YOUR SAVED PIECES</span><h1>THE <em>WISHLIST.</em></h1>{selected.length ? <div className="products-grid">{selected.map((p, i) => <ProductCard product={p} index={i} key={p.slug} />)}</div> : <div className="no-results"><h2>NOTHING SAVED YET.</h2><p>Tap the heart on anything that catches your eye.</p><Link className="button button-dark" href="/shop">SHOP THE COLLECTION <span>↗</span></Link></div>}</div>;
}
