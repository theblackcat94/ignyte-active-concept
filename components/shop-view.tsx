"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { categories, products, type Category } from "@/lib/catalog";
import ProductCard from "./product-card";

export default function ShopView({ category }: { category: Category }) {
  const [sort, setSort] = useState("featured");
  const [colors, setColors] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const query = useSearchParams().get("q")?.toLowerCase() || "";
  const currentCategory = categories.find(c => c.id === category) || categories[0];
  const label = currentCategory.label;
  const visible = useMemo(() => {
    const found = products.filter(p => (category === "all" || p.category === category) && (!query || `${p.name} ${p.color} ${p.category}`.toLowerCase().includes(query)) && (!colors.length || colors.includes(p.color)));
    return [...found].sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : sort === "name" ? a.name.localeCompare(b.name) : 0);
  }, [category, sort, colors, query]);
  const toggleColor = (color: string) => setColors(current => current.includes(color) ? current.filter(c => c !== color) : [...current, color]);

  return <div className="shop-page"><div className="shop-banner" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.88), rgba(0,0,0,.25)), url("${currentCategory.cover}")` }}><span className="eyebrow light">IGNYTE / THE COLLECTION</span><h1>{query ? "SEARCH RESULTS" : label.toUpperCase()}<em>.</em></h1><p>Pieces for every rep, every rest day, every version of you.</p></div><div className="section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>{label.toUpperCase()}</span></div><div className="shop-category-links">{categories.map(c => <Link className={c.id === category ? "active" : ""} href={c.id === "all" ? "/shop" : `/shop/${c.id}`} key={c.id}>{c.label}</Link>)}</div><div className="shop-controls"><span>{visible.length} {visible.length === 1 ? "PIECE" : "PIECES"}</span><div><button onClick={() => setFilterOpen(!filterOpen)}>FILTER {colors.length ? `(${colors.length})` : ""} <span>{filterOpen ? "−" : "+"}</span></button><label>SORT <select value={sort} onChange={e => setSort(e.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label></div></div>{filterOpen && <div className="filter-panel"><span>COLOUR</span>{["Lavender", "Espresso"].map(color => <label key={color}><input type="checkbox" checked={colors.includes(color)} onChange={() => toggleColor(color)} /> {color}</label>)}{colors.length > 0 && <button onClick={() => setColors([])}>CLEAR FILTERS</button>}</div>}<div className="products-grid shop-products">{visible.map((product, index) => <ProductCard product={product} index={index} key={product.slug} />)}</div>{!visible.length && <div className="no-results"><h2>NO MATCHES FOUND.</h2><p>Try another search or clear your filters.</p><Link href="/shop" className="button button-dark">SHOP ALL <span>↗</span></Link></div>}</div></div>;
}
