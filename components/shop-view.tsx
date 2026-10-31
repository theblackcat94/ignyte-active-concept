"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/catalog";
import { useStore } from "./store-provider";
import ProductCard from "./product-card";
import StyledSelect from "./styled-select";
import RegistrationMarks from "./registration-marks";
import { compareProductColours } from "@/lib/product-colors";
import "@/app/shop-filters.css";

const collectionIntroductions: Record<string, string> = {
  "sports-bras": "Explore sports bras for different ways to train, from seamless support to cross-back and strappy designs.",
  leggings: "Find close-fitting leggings made for comfortable movement through training and beyond.",
  shorts: "Choose from relaxed training shorts, close-fitting bike shorts and seamless silhouettes.",
  tops: "Explore fitted training tops with versatile, expressive styling for your next session.",
  accessories: "Finish your look with practical training essentials, including IGNYTE crew socks.",
};

export default function ShopView({ category }: { category: Category }) {
  const { products, categories, catalogPreview, catalogLoading } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const updateFilter = (key: string, values: string[]) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete(key);
    values.forEach(value => next.append(key, value));
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const sort = searchParams.get("sort") ?? "featured";
  const setSort = (value: string) => updateFilter("sort", value === "featured" ? [] : [value]);
  const colors = searchParams.getAll("color");
  const sizes = searchParams.getAll("size");
  const activities = searchParams.getAll("activity");
  const fits = searchParams.getAll("fit");
  const coverages = searchParams.getAll("coverage");
  const setColors = (values: string[]) => updateFilter("color", values);
  const setSizes = (values: string[]) => updateFilter("size", values);
  const setActivities = (values: string[]) => updateFilter("activity", values);
  const setFits = (values: string[]) => updateFilter("fit", values);
  const setCoverages = (values: string[]) => updateFilter("coverage", values);
  const rawAvailability = searchParams.get("availability");
  const availability = rawAvailability === "in-stock" || rawAvailability === "sold-out" ? rawAvailability : "all";
  const setAvailability = (value: "all" | "in-stock" | "sold-out") => updateFilter("availability", value === "all" ? [] : [value]);
  const [filterOpen, setFilterOpen] = useState(false);
  const query = searchParams.get("q")?.toLowerCase() || "";
  const currentCategory = categories.find(item => item.id === category) || categories[0];
  const categoryProducts = products.filter(product => category === "all" || product.category === category);
  const availableColors = [...new Set(categoryProducts.map(product => product.color))].sort(compareProductColours);
  const availableSizes = [...new Set(categoryProducts.flatMap(product => product.variants?.map(variant => variant.size) ?? []))].sort((a, b) => ["XS", "S", "M", "L", "XL", "ONE SIZE"].indexOf(a) - ["XS", "S", "M", "L", "XL", "ONE SIZE"].indexOf(b));
  const availableActivities = [...new Set(categoryProducts.flatMap(product => product.pdp.activities.map(activity => activity.trim()).filter(Boolean)))].sort();
  const availableFits = [...new Set(categoryProducts.map(product => product.fitAttribute).filter((value): value is string => Boolean(value)))].sort();
  const availableCoverages = [...new Set(categoryProducts.map(product => product.coverageAttribute).filter((value): value is string => Boolean(value)))].sort();
  const selectedCount = colors.length + sizes.length + activities.length + fits.length + coverages.length + Number(availability !== "all");
  const found = categoryProducts.filter(product =>
    (!query || `${product.name} ${product.color} ${product.category}`.toLowerCase().includes(query)) &&
    (!colors.length || colors.includes(product.color)) &&
    (!sizes.length || product.variants?.some(variant => sizes.includes(variant.size))) &&
    (!activities.length || activities.some(activity => product.pdp.activities.includes(activity))) &&
    (!fits.length || Boolean(product.fitAttribute && fits.includes(product.fitAttribute))) &&
    (!coverages.length || Boolean(product.coverageAttribute && coverages.includes(product.coverageAttribute))) &&
    (catalogLoading || availability === "all" || (product.variants?.some(variant => variant.stock > 0 && (!sizes.length || sizes.includes(variant.size))) ?? false) === (availability === "in-stock")));
  const visible = [...found].sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : sort === "name" ? a.name.localeCompare(b.name) : 0);
  const toggle = (current: string[], value: string, setter: (next: string[]) => void) => setter(current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams.toString());
    ["color", "size", "activity", "fit", "coverage", "availability"].forEach(key => next.delete(key));
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };
  const activeFilters = [
    ...colors.map(value => ({ label: value, remove: () => setColors(colors.filter(item => item !== value)) })),
    ...sizes.map(value => ({ label: value, remove: () => setSizes(sizes.filter(item => item !== value)) })),
    ...fits.map(value => ({ label: value, remove: () => setFits(fits.filter(item => item !== value)) })),
    ...coverages.map(value => ({ label: value, remove: () => setCoverages(coverages.filter(item => item !== value)) })),
    ...activities.map(value => ({ label: value, remove: () => setActivities(activities.filter(item => item !== value)) })),
    ...(availability === "all" ? [] : [{ label: availability === "in-stock" ? "In stock" : "Sold out", remove: () => setAvailability("all" as const) }]),
  ];

  return <div className="shop-page">
    <div className={`shop-banner ${category === "sports-bras" ? "shop-banner-bras" : ""}`} style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.88), rgba(0,0,0,.25)), url("${currentCategory.cover}")` }}><RegistrationMarks /><span className="eyebrow light">IGNYTE / THE COLLECTION</span><h1>{query ? "SEARCH RESULTS" : currentCategory.label.toUpperCase()}<em>.</em></h1><p>{collectionIntroductions[category] ?? "Pieces for every rep, every rest day, every version of you."}</p></div>
    <div className="section-wrap">
      <div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>{currentCategory.label.toUpperCase()}</span></div>
      <div className="shop-category-links">{categories.map(item => <Link className={item.id === category ? "active" : ""} href={item.id === "all" ? "/shop" : `/shop/${item.id}`} key={item.id}>{item.label}</Link>)}</div>
      {catalogPreview && !catalogLoading && <p className="catalog-preview-note">Collection preview. Ordering opens when product sizes and stock are confirmed.</p>}
      <div className="shop-controls"><span>{visible.length} {visible.length === 1 ? "PIECE" : "PIECES"}</span><div><button type="button" aria-expanded={filterOpen} onClick={() => setFilterOpen(!filterOpen)}>FILTER {selectedCount ? `(${selectedCount})` : ""} <span>{filterOpen ? "−" : "+"}</span></button><div className="shop-sort"><span>SORT</span><StyledSelect value={sort} onChange={setSort} ariaLabel="Sort products" options={[{ value: "featured", label: "Featured" }, { value: "price-low", label: "Price: low to high" }, { value: "price-high", label: "Price: high to low" }, { value: "name", label: "Name" }]} /></div></div></div>
      {filterOpen && <><button type="button" className="filter-backdrop" aria-label="Close filters" onClick={() => setFilterOpen(false)} /><div className="filter-panel" aria-label="Shop filters"><div className="filter-drawer-head"><strong>FILTER PRODUCTS</strong><button type="button" onClick={() => setFilterOpen(false)} aria-label="Close filters">×</button></div>
        <fieldset><legend>COLOUR</legend>{availableColors.map(color => <label key={color} className={colors.includes(color) ? "selected" : ""}><input type="checkbox" checked={colors.includes(color)} onChange={() => toggle(colors, color, setColors)} />{color}</label>)}</fieldset>
        {availableSizes.length > 0 && <fieldset><legend>SIZE</legend>{availableSizes.map(size => <label key={size} className={sizes.includes(size) ? "selected" : ""}><input type="checkbox" checked={sizes.includes(size)} onChange={() => toggle(sizes, size, setSizes)} />{size}</label>)}</fieldset>}
        {availableFits.length > 0 && <fieldset><legend>FIT</legend>{availableFits.map(fit => <label key={fit} className={fits.includes(fit) ? "selected" : ""}><input type="checkbox" checked={fits.includes(fit)} onChange={() => toggle(fits, fit, setFits)} />{fit}</label>)}</fieldset>}
        {availableCoverages.length > 0 && <fieldset><legend>COVERAGE</legend>{availableCoverages.map(coverage => <label key={coverage} className={coverages.includes(coverage) ? "selected" : ""}><input type="checkbox" checked={coverages.includes(coverage)} onChange={() => toggle(coverages, coverage, setCoverages)} />{coverage}</label>)}</fieldset>}
        <fieldset><legend>AVAILABILITY</legend><label><input type="radio" name="availability" checked={availability === "all"} onChange={() => setAvailability("all")} />All</label><label><input type="radio" name="availability" checked={availability === "in-stock"} onChange={() => setAvailability("in-stock")} />In stock</label><label><input type="radio" name="availability" checked={availability === "sold-out"} onChange={() => setAvailability("sold-out")} />Sold out</label></fieldset>
        {availableActivities.length > 0 && <fieldset><legend>ACTIVITY</legend>{availableActivities.map(activity => <label key={activity} className={activities.includes(activity) ? "selected" : ""}><input type="checkbox" checked={activities.includes(activity)} onChange={() => toggle(activities, activity, setActivities)} />{activity}</label>)}</fieldset>}
      <button type="button" className="filter-show-results" onClick={() => setFilterOpen(false)}>SHOW {visible.length} {visible.length === 1 ? "RESULT" : "RESULTS"} ↗</button></div></>}
      {selectedCount > 0 && <div className="shop-active-filters" aria-live="polite"><span>ACTIVE FILTERS</span><div>{activeFilters.map((filter, index) => <button type="button" className="filter-chip" key={`${filter.label}-${index}`} onClick={filter.remove} aria-label={`Remove ${filter.label} filter`}>{filter.label} <span aria-hidden="true">×</span></button>)}</div><button type="button" className="filter-clear" onClick={clearFilters}>CLEAR ALL</button></div>}
      <div className="products-grid shop-products">{visible.map((product, index) => <ProductCard product={product} index={index} key={product.slug} />)}</div>
      {!visible.length && <div className="no-results"><h2>NO MATCHES FOUND.</h2><p>Try another search or clear your filters.</p><button type="button" className="button button-dark" onClick={clearFilters}>CLEAR ALL ↗</button></div>}
    </div>
  </div>;
}
