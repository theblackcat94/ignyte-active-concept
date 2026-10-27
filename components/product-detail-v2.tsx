"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type Product, money } from "@/lib/catalog";
import { commerceConfigured } from "@/lib/commerce";
import { useStore } from "./store-provider";
import ProductCard from "./product-card";
import ProductGallery from "./product-gallery";
import SizeGuideContent from "./size-guide-content";
import { CurrencyEstimate } from "./currency-estimate";
import { productColourHex } from "@/lib/product-colors";
import "@/app/product-detail-v2.css";

export default function ProductDetail({ product }: { product: Product }) {
  const [size, setSize] = useState("");
  const [openInfo, setOpenInfo] = useState<string | null>("FEATURES");
  const [guideOpen, setGuideOpen] = useState(false);
  const { products, addToBag, wishlist, toggleWishlist } = useStore();
  const related = products.filter(p => p.slug !== product.slug).slice(0, 4);
  const colours = [product, ...products.filter(p => p.slug !== product.slug && p.name === product.name && p.category === product.category)]
    .filter((item, index, all) => all.findIndex(candidate => candidate.color.toLowerCase() === item.color.toLowerCase()) === index);
  const sizes: NonNullable<Product["variants"]> = product.variants ? product.variants : (product.slug.includes("socks") ? ["ONE SIZE"] : ["XS", "S", "M", "L", "XL"]).map(value => ({ id: value, size: value, price: product.price, stock: commerceConfigured ? 0 : 1 }));
  const selectedVariant = sizes.find(variant => variant.size === size);
  const canAdd = Boolean(size && selectedVariant && selectedVariant.stock > 0);
  const addLabel = !size ? "SELECT A SIZE" : canAdd ? "ADD TO BAG" : product.variants ? "SOLD OUT" : "PREVIEW ONLY";
  const pdp = product.pdp;
  useEffect(() => {
    if (!guideOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setGuideOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [guideOpen]);
  const sections = ["FEATURES", "DESIGNED FOR", "FIT & FABRIC", "MODEL DETAILS", "SIZE GUIDE", "DELIVERY & RETURNS"].filter(label =>
    label === "FEATURES" ? pdp.features.length : label === "DESIGNED FOR" ? pdp.activities.length : label === "FIT & FABRIC" ? Boolean(pdp.fit || pdp.fabric || pdp.oeko_certified) : label === "MODEL DETAILS" ? Boolean(pdp.model_details.trim()) : true);

  function content(label: string) {
    if (label === "FEATURES") return <ul className="pdp-feature-list">{pdp.features.map(feature => <li key={feature}>{feature}</li>)}</ul>;
    if (label === "DESIGNED FOR") return <div className="pdp-activity-list">{pdp.activities.map(activity => <span key={activity}>{activity}</span>)}</div>;
    if (label === "FIT & FABRIC") return <div className="pdp-fit-fabric">{pdp.fit && <p><strong>Fit:</strong> {pdp.fit}</p>}{pdp.fabric && <p><strong>Fabric:</strong> {pdp.fabric}</p>}{pdp.oeko_certified && <div className="pdp-oeko"><strong>OEKO-TEX® STANDARD 100</strong><p>Made with OEKO-TEX® STANDARD 100 certified fabrics, tested for harmful substances so you can feel confident in what’s against your skin.</p>{pdp.oeko_certificate && <a href="https://www.oeko-tex.com/en/label-check" target="_blank" rel="noreferrer">Check certificate {pdp.oeko_certificate} ↗</a>}</div>}</div>;
    if (label === "MODEL DETAILS") return <p className="pdp-model-details">{pdp.model_details}</p>;
    if (label === "SIZE GUIDE") return <><SizeGuideContent /><Link className="text-link" href="/size-guide">OPEN FULL SIZE GUIDE ↗</Link></>;
    return <div className="pdp-delivery"><p>Australia only. Free shipping on orders of $100 or more. Delivery rates for smaller orders and prepaid return labels are being confirmed with the fulfilment team.</p><Link className="text-link" href="/returns">VIEW RETURNS POLICY ↗</Link></div>;
  }

  return <div className="product-page section-wrap">
    <div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href={`/shop/${product.category}`}>{product.category.toUpperCase().replace("-", " ")}</Link><span>/</span><span>{product.name.toUpperCase()}</span></div>
    <div className="detail-grid"><ProductGallery product={product} /><div className="detail-info"><span className="eyebrow">IGNYTE / {product.category.toUpperCase().replace("-", " ")}</span><h1>{product.name.toUpperCase()}<em>.</em></h1>
      <div className="detail-price">{(selectedVariant?.originalPrice ?? product.originalPrice) && <del>{money((selectedVariant?.originalPrice ?? product.originalPrice)!)}</del>}<span>{money(selectedVariant?.price ?? product.price)}<CurrencyEstimate aud={selectedVariant?.price ?? product.price} /></span></div>
      <p className="detail-description">{product.description}</p>{commerceConfigured && !product.variants && <p className="catalog-preview-note">Preview item. Available to order after sizes and stock are confirmed.</p>}
      <div className="detail-color">COLOUR: <strong>{product.color.toUpperCase()}</strong></div>
      <div className="pdp-colour-options" aria-label={`Available ${product.name} colours`}>
        {colours.map(option => <Link key={option.slug} href={`/product/${option.slug}/`} className={`pdp-colour-option ${option.slug === product.slug ? "selected" : ""}`} aria-label={`${option.color}${option.slug === product.slug ? ", selected" : ""}`} aria-current={option.slug === product.slug ? "page" : undefined} title={option.color}>
          <span className={`pdp-colour-swatch ${option.color.toLowerCase() === "white" ? "is-white" : ""}`} style={{ backgroundColor: productColourHex(option.color) ?? "#D6D1CB" }} />
          <span>{option.color.toUpperCase()}</span>
        </Link>)}
      </div>
      <div className="size-heading"><span>SELECT SIZE</span><button type="button" onClick={() => setGuideOpen(true)}>SIZE GUIDE ↗</button></div>
      <div className="size-grid">{sizes.map(variant => <button type="button" className={size === variant.size ? "selected" : ""} aria-pressed={size === variant.size} onClick={() => setSize(variant.size)} key={variant.id}>{variant.size}</button>)}</div>
      <button type="button" className="button button-orange detail-add" onClick={() => size && addToBag(product.slug, size)} disabled={!canAdd}>{addLabel}<span>↗</span></button>
      <button type="button" className="wishlist-button" onClick={() => toggleWishlist(product.slug)}>{wishlist.includes(product.slug) ? "♥ SAVED TO WISHLIST" : "♡ ADD TO WISHLIST"}</button>
      <div className="detail-accordions">{sections.map(label => <div key={label}><button type="button" aria-expanded={openInfo === label} onClick={() => setOpenInfo(openInfo === label ? null : label)}>{label}<span>{openInfo === label ? "−" : "+"}</span></button>{openInfo === label && content(label)}</div>)}</div>
    </div></div>
    {pdp.show_brand_story && <div className="pdp-story"><section><span className="eyebrow">PERFORMANCE MEETS EXPRESSION ↘</span><h2>Find your rhythm.<br />Move your way.</h2><p>Made for women who train with purpose and bring their own energy to every session.</p></section><section><span className="eyebrow">THE IGNYTE APPROACH ↘</span><h2>Made for movement.</h2><p>Fit, feel and freedom of movement guide the details, from warm-up to final rep.</p></section><section><span className="eyebrow">THE DETAILS ↘</span><h2>Built for the burn.</h2><ul>{(pdp.features.length ? pdp.features : ["Explore the fit and fabric details in the product information above."]).slice(0, 4).map(feature => <li key={feature}>{feature}</li>)}</ul></section></div>}
    <div className="related-section"><div className="section-heading"><div><span className="eyebrow">KEEP THE MOMENTUM</span><h2>YOU MAY <em>ALSO LIKE.</em></h2></div><Link href="/shop" className="text-link">SHOP ALL ↗</Link></div><div className="products-grid">{related.map((p, i) => <ProductCard product={p} index={i} key={p.slug} />)}</div></div>
    {guideOpen && <div className="pdp-guide-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setGuideOpen(false); }}><div className="pdp-guide-dialog" role="dialog" aria-modal="true" aria-label="Size guide"><div className="pdp-guide-head"><h2>FIND YOUR FIT.</h2><button type="button" onClick={() => setGuideOpen(false)} aria-label="Close size guide">×</button></div><SizeGuideContent /><Link href="/size-guide" className="text-link">OPEN FULL SIZE GUIDE ↗</Link></div></div>}
  </div>;
}
