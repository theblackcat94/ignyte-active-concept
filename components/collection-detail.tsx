"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useStore } from "@/components/store-provider";
import ProductCard from "@/components/product-card";
import type { CuratedCollection } from "@/lib/collections";
import { inStock } from "@/lib/product-merchandising";
import "@/app/collections/collections.css";

export default function CollectionDetail({ collection }: { collection: CuratedCollection }) {
  const { products } = useStore();
  const [sort, setSort] = useState("curated");
  const [category, setCategory] = useState("all");
  const selected = collection.mode === "automatic"
    ? products.filter(item => item.category === collection.rules.category && inStock(item))
    : collection.product_slugs.map(slug => products.find(item => item.slug === slug)).filter((item): item is (typeof products)[number] => Boolean(item && inStock(item)));
  const categories = [...new Set(selected.map(item => item.category))];
  const shown = selected.filter(item => category === "all" || item.category === category).sort((a, b) => sort === "price-asc" ? a.price - b.price : sort === "price-desc" ? b.price - a.price : sort === "name" ? a.name.localeCompare(b.name) : 0);
  return <main className="collections-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href="/collections">COLLECTIONS</Link><span>/</span><span>{collection.name.toUpperCase()}</span></div>
    {collection.cover_path && <div className="curated-collection-cover"><Image src={collection.cover_path} alt={collection.cover_alt} fill sizes="100vw" style={{ objectFit: "cover", objectPosition: `${collection.focal_x}% ${collection.focal_y}%` }} /></div>}
    <span className="eyebrow">IGNYTE / CURATED</span><h1>{collection.name.toUpperCase()}<span>.</span></h1><p>{collection.description}</p>
    {selected.length ? <><div className="curated-collection-controls"><label>CATEGORY <select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All</option>{categories.map(item => <option key={item} value={item}>{item.replace("-", " ")}</option>)}</select></label><label>SORT <select value={sort} onChange={event => setSort(event.target.value)}><option value="curated">Curated order</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label></div><div className="curated-collection-grid">{shown.map((product, index) => <ProductCard key={product.slug} product={product} index={index} showOptions />)}</div></> : <p>No available products in this collection right now.</p>}
  </main>;
}
