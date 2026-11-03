"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@/components/store-provider";
import { publicCollections, type CuratedCollection } from "@/lib/collections";
import "./collections.css";
export default function CollectionsPage() {
  const { categories } = useStore();
  const [curated, setCurated] = useState<CuratedCollection[]>([]);
  useEffect(() => { void publicCollections().then(setCurated).catch(() => setCurated([])); }, []);
  return <div className="collections-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>COLLECTIONS</span></div><span className="eyebrow">IGNYTE / CURATED</span><h1>THE COLLECTION<span>.</span></h1><p>Explore curated edits and the pieces made for your next move.</p>{curated.length > 0 && <section aria-labelledby="shop-by-collection"><h2 id="shop-by-collection" className="collections-section-heading">SHOP BY COLLECTION_</h2><div className="collections-grid">{curated.map(collection => <Link href={`/collections/${collection.slug}`} className="collections-tile" key={collection.id}>{collection.cover_path && <img src={collection.cover_path} alt={collection.cover_alt} style={{ objectPosition: `${collection.focal_x}% ${collection.focal_y}%` }} />}<span>{collection.name.toUpperCase()} <b>↗</b></span></Link>)}</div></section>}<h2 className="collections-section-heading">SHOP BY CATEGORY_</h2><div className="collections-grid">{categories.filter(category => category.id !== "all").map(category => <Link href={`/shop/${category.id}`} className="collections-tile" key={category.id}><img src={category.cover} alt={category.coverAlt || ""} /><span>{category.label.toUpperCase()} <b>↗</b></span></Link>)}</div><Link className="button button-dark" href="/shop">SHOP ALL ↗</Link></div>;
}
