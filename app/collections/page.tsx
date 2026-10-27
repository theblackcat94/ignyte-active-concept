"use client";
import Link from "next/link";
import { useStore } from "@/components/store-provider";
import "./collections.css";
export default function CollectionsPage() {
  const { categories } = useStore();
  return <div className="collections-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>COLLECTIONS</span></div><span className="eyebrow">IGNYTE / FIND YOUR FIT</span><h1>THE COLLECTION<span>.</span></h1><p>Built for every way you bring the fire. Explore the pieces by category.</p><div className="collections-grid">{categories.filter(category => category.id !== "all").map(category => <Link href={`/shop/${category.id}`} className="collections-tile" key={category.id}><img src={category.cover} alt="" /><span>{category.label.toUpperCase()} <b>↗</b></span></Link>)}</div><Link className="button button-dark" href="/shop">SHOP ALL ↗</Link></div>;
}
