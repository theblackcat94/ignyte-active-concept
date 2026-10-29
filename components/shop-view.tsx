"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/catalog";
import { useStore } from "./store-provider";
import ProductCard from "./product-card";
import "@/app/shop-filters.css";

export default function ShopView({ category }: { category: Category }) {
  const { products, categories, catalogPreview, catalogLoading } = useStore();
  const [sort, setSort] = useState("featured");
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [availability, setAvailability] = useState<"all" | "in-stock" | "sold-out">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const query = useSearchParams().get("q")?.toLowerCase() || "";
  const currentCategory = categories.find(item => item.id === category) || categories[0];
  const categoryProducts = products.filter(product => category === "all" || product.category === category);
  const availableColors = [...new Set(categoryProducts.map(product => product.color))].sort();
  const availableSizes = [...new Set(categoryProducts.flatMap(product => product.variants?.map(variant => variant.size) ?? []))].sort((a, b) => ["XS", "S", "M", "L", "XL", "ONE SIZE"].indexOf(a) - ["XS", "S", "M", "L", "XL", "ONE SIZE"].indexOf(b));
  const availableActivities = [...new Set(categoryProducts.flatMap(product => product.pdp.activities.map(activity => activity.trim()).filter(Boolean)))].sort();
  const selectedCount = colors.length + sizes.length + activities.length + Number(availability !== "all");
  const found = categoryProducts.filter(product =>
    (!query || `${product.name} ${product.color} ${product.category}`.toLowerCase().includes(query)) &&
    (!colors.length || colors.includes(product.color)) &&
    (!sizes.length || product.variants?.some(variant => sizes.includes(variant.size))) &&
    (!activities.length || activities.some(activity => product.pdp.activities.includes(activity))) &&
    (catalogLoading || availability === "all" || (product.variants?.some(variant => variant.stock > 0 && (!sizes.length || sizes.includes(variant.size))) ?? false) === (availability === "in-stock")));
  const visible = [...found].sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : sort === "name" ? a.name.localeCompare(b.name) : 0);
  const toggle = (current: string[], value: string, setter: (next: string[]) => void) => setter(current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  const clearFilters = () => { setColors([]); setSizes([]); setActivities([]); setAvailability("all"); };

  return <div className="shop-page">
    <div className={`shop-banner ${category === "sports-bras" ? "shop-banner-bras" : ""}`} style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.88), rgba(0,0,0,.25)), url("${currentCategory.cover}")` }}><span className="eyebrow light">IGNYTE / THE COLLECTION</span><h1>{query ? "SEARCH RESULTS" : currentCategory.label.toUpperCase()}<em>.</em></h1><p>Pieces for every rep, every rest day, every version of you.</p></div>
    <div className="section-wrap">
      <div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>{currentCategory.label.toUpperCase()}</span></div>
      <div className="shop-category-links">{categories.map(item => <Link className={item.id === category ? "active" : ""} href={item.id === "all" ? "/shop" : `/shop/${item.id}`} key={item.id}>{item.label}</Link>)}</div>
      {catalogPreview && !catalogLoading && <p className="catalog-preview-note">Collection preview. Ordering opens when product sizes and stock are confirmed.</p>}
      <div className="shop-controls"><span>{visible.length} {visible.length === 1 ? "PIECE" : "PIECES"}</span><div><button type="button" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}>FILTER {selectedCount ? `(${selectedCount})` : ""} <span>{filterOpen ? "−" : "+"}</span></button><label>SORT <select value={sort} onChange={event => setSort(event.target.value)}><option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label></div></div>
      {filterOpen && <div className="filter-panel" aria-label="Shop filters">
        <fieldset><legend>COLOUR</legend>{availableColors.map(color => <label key={color}><input type="checkbox" checked={colors.includes(color)} onChange={() => toggle(colors, color, setColors)} />{color}</label>)}</fieldset>
        <fieldset><legend>SIZE</legend>{availableSizes.map(size => <label key={size}><input type="checkbox" checked={sizes.includes(size)} onChange={() => toggle(sizes, size, setSizes)} />{size}</label>)}</fieldset>
        <fieldset><legend>AVAILABILITY</legend><label><input type="radio" name="availability" checked={availability === "all"} onChange={() => setAvailability("all")} />All</label><label><input type="radio" name="availability" checked={availability === "in-stock"} onChange={() => setAvailability("in-stock")} />In stock</label><label><input type="radio" name="availability" checked={availability === "sold-out"} onChange={() => setAvailability("sold-out")} />Sold out</label></fieldset>
        {availableActivities.length > 0 && <fieldset><legend>ACTIVITY</legend>{availableActivities.map(activity => <label key={activity}><input type="checkbox" checked={activities.includes(activity)} onChange={() => toggle(activities, activity, setActivities)} />{activity}</label>)}</fieldset>}
      </div>}
      {selectedCount > 0 && <div className="shop-active-filters" aria-live="polite"><span>ACTIVE: {[...colors, ...sizes, ...activities, ...(availability === "all" ? [] : [availability === "in-stock" ? "In stock" : "Sold out"])].join(" · ")}</span><button type="button" onClick={clearFilters}>CLEAR ALL</button></div>}
      <div className="products-grid shop-products">{visible.map((product, index) => <ProductCard product={product} index={index} key={product.slug} />)}</div>
      {!visible.length && <div className="no-results"><h2>NO MATCHES FOUND.</h2><p>Try another search or clear your filters.</p><button type="button" className="button button-dark" onClick={clearFilters}>CLEAR ALL ↗</button></div>}
    </div>
  </div>;
}
