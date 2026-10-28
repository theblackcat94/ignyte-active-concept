"use client";

import Link from "next/link";
import { showDraftCareGuide } from "@/data/storefront-flags";
import { useEffect, useState } from "react";
import { type Product, money } from "@/lib/catalog";
import { commerceConfigured } from "@/lib/commerce";
import { useStore } from "./store-provider";
import ProductCard from "./product-card";
import ProductGallery from "./product-gallery";
import StackedProductGallery from "./stacked-product-gallery";
import SizeGuideContent from "./size-guide-content";
import { CurrencyEstimate } from "./currency-estimate";
import { productColourHex } from "@/lib/product-colors";
import { pairedProducts } from "@/lib/product-merchandising";
import "@/app/product-detail-v2.css";

export default function ProductDetail({ product, galleryLayout = "carousel" }: { product: Product; galleryLayout?: "carousel" | "stacked" }) {
  const [size, setSize] = useState("");
  const [openInfo, setOpenInfo] = useState<string | null>("FEATURES");
  const [guideOpen, setGuideOpen] = useState(false);
  const { products, addToBag, wishlist, toggleWishlist } = useStore();
  const related = pairedProducts(product.slug, products, "related");
  const upsells = pairedProducts(product.slug, products, "upsell");
  const colours = [product, ...products.filter(p => p.slug !== product.slug && p.name === product.name && p.category === product.category)]
    .filter((item, index, all) => all.findIndex(candidate => candidate.color.toLowerCase() === item.color.toLowerCase()) === index);
  const sizes: NonNullable<Product["variants"]> = product.variants ? product.variants : (product.slug.includes("socks") ? ["ONE SIZE"] : ["XS", "S", "M", "L", "XL"]).map(value => ({ id: value, size: value, price: product.price, stock: commerceConfigured ? 0 : 1 }));
  const selectedVariant = sizes.find(variant => variant.size === size);
  const canAdd = Boolean(size && selectedVariant && selectedVariant.stock > 0);
  const addLabel = !sizes.some(variant => variant.stock > 0) ? "SOLD OUT" : !size ? "SELECT A SIZE" : canAdd ? "ADD TO BAG" : product.variants ? "SOLD OUT" : "PREVIEW ONLY";
  const pdp = product.pdp;
  useEffect(() => {
    if (!guideOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setGuideOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [guideOpen]);
  const sections = ["FEATURES", "DESIGNED FOR", "FIT & FABRIC", "MODEL DETAILS", "SIZE GUIDE", "CARE GUIDE", "DELIVERY & RETURNS"].filter(label =>
    label === "FEATURES" ? pdp.features.length : label === "DESIGNED FOR" ? pdp.activities.length : label === "FIT & FABRIC" ? Boolean(pdp.fit || pdp.fabric || pdp.oeko_certified) : label === "MODEL DETAILS" ? Boolean(pdp.show_model_details && pdp.model_details.trim()) : label === "CARE GUIDE" ? product.category !== "accessories" && (Boolean(pdp.care_approved) || showDraftCareGuide) : true);

  function content(label: string) {
    if (label === "FEATURES") return <ul className="pdp-feature-list">{pdp.features.map(feature => <li key={feature}>{feature}</li>)}</ul>;
    if (label === "DESIGNED FOR") return <div className="pdp-activity-list">{pdp.activities.map(activity => <span key={activity}>{activity}</span>)}</div>;
    if (label === "FIT & FABRIC") return <div className="pdp-fit-fabric">{pdp.fit && <p><strong>Fit:</strong> {pdp.fit}</p>}{pdp.fabric && <p><strong>Fabric:</strong> {pdp.fabric}</p>}{pdp.oeko_certified && <div className="pdp-oeko"><strong>OEKO-TEX® STANDARD 100</strong><p>Made with OEKO-TEX® STANDARD 100 certified fabrics, tested for harmful substances so you can feel confident in what’s against your skin.</p>{pdp.oeko_certificate && <a href="https://www.oeko-tex.com/en/label-check" target="_blank" rel="noreferrer">Check certificate {pdp.oeko_certificate} ↗</a>}</div>}</div>;
    if (label === "MODEL DETAILS") return <p className="pdp-model-details">{pdp.model_details}</p>;
    if (label === "SIZE GUIDE") return <><SizeGuideContent productCategory={product.category} /><div className="pdp-size-guide-link"><Link className="text-link" href="/size-guide">OPEN FULL SIZE GUIDE ↗</Link></div></>;
    if (label === "CARE GUIDE") return <div className="pdp-care">{!pdp.care_approved && <p className="pdp-review-note">Care instructions are being checked against garment labels. Follow the label on your item.</p>}<strong>Care for your kit</strong><p>Keep your IGNYTE activewear ready for your next move.</p><ul><li>Machine wash cold at 30°C on a gentle cycle.</li><li>Turn inside out and wash with similar colours.</li><li>Use a mild detergent. Avoid fabric softener and bleach.</li><li>Wash separately from towels and items with exposed zips or Velcro.</li><li>Air dry in the shade. Do not tumble dry.</li><li>Do not iron or dry clean.</li></ul><p>After a sweaty session, let your gear air out before placing it in the laundry basket. Always follow the care label on your garment.</p></div>;
    return <div className="pdp-delivery"><p>Australia only. Free shipping on orders of $100 or more. Delivery rates for smaller orders and prepaid return labels are being confirmed with the fulfilment team.</p><Link className="text-link" href="/returns">VIEW RETURNS POLICY ↗</Link></div>;
  }

  return <div className={`product-page section-wrap${galleryLayout === "stacked" ? " pdp-stack-preview" : ""}`}>
    <div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><Link href={`/shop/${product.category}`}>{product.category.toUpperCase().replace("-", " ")}</Link><span>/</span><span>{product.name.toUpperCase()}</span></div>
    <div className="detail-grid">{galleryLayout === "stacked" ? <StackedProductGallery product={product} /> : <ProductGallery product={product} />}<div className="detail-info"><span className="eyebrow">IGNYTE / {product.category.toUpperCase().replace("-", " ")}</span><h1>{product.name.toUpperCase()}<em>.</em></h1>
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
      <div className="size-grid">{sizes.map(variant => <button type="button" className={size === variant.size ? "selected" : ""} aria-pressed={size === variant.size} aria-label={`${variant.size}${variant.stock <= 0 ? ", out of stock" : ""}`} disabled={variant.stock <= 0} onClick={() => setSize(variant.size)} key={variant.id}>{variant.size}</button>)}</div>
      <button type="button" className="button button-orange detail-add" onClick={() => size && addToBag(product.slug, size)} disabled={!canAdd}>{addLabel}<span>↗</span></button>
      <button type="button" className="wishlist-button" onClick={() => toggleWishlist(product.slug)}>{wishlist.includes(product.slug) ? "♥ SAVED TO WISHLIST" : "♡ ADD TO WISHLIST"}</button>
      <div className="detail-accordions">{sections.map(label => <div key={label}><button type="button" aria-expanded={openInfo === label} onClick={() => setOpenInfo(openInfo === label ? null : label)}>{label}<span>{openInfo === label ? "−" : "+"}</span></button>{openInfo === label && content(label)}</div>)}</div>
    </div></div>
    <div className="pdp-brand-callout"><div><span className="eyebrow">PERFORMANCE MEETS EXPRESSION ↘</span><h2>Built for the burn<sup>™</sup></h2><p>For women who train with purpose and express themselves with confidence. From the first warm-up to the final rep, bring your energy and make every session your own.</p></div><img src="/images/home/Home-Hero-Alt-5.jpg" alt="Ignyte athlete training with battle ropes" loading="lazy" /></div>
    {pdp.show_brand_story && <div className="pdp-story"><section><span className="eyebrow">THE IGNYTE APPROACH ↘</span><h2>Made for movement.</h2><p>Fit, feel and freedom of movement guide the details, from warm-up to final rep.</p></section><section><span className="eyebrow">THE DETAILS ↘</span><h2>Tested in real training.</h2><p>Built for sweat, pressure, and repeat wear.</p><ul>{(pdp.features.length ? pdp.features : ["Explore the fit and fabric details in the product information above."]).slice(0, 4).map(feature => <li key={feature}>{feature}</li>)}</ul></section></div>}
    {related.length > 0 && <div className="related-section"><div className="section-heading"><div><span className="eyebrow">COMPLETE YOUR EDIT</span><h2>PAIR IT <em>WITH.</em></h2></div><Link href="/shop" className="text-link">SHOP ALL ↗</Link></div><div className="products-grid">{related.map((p, i) => <ProductCard product={p} index={i} key={p.slug} />)}</div></div>}
    {upsells.length > 0 && <div className="related-section"><div className="section-heading"><div><span className="eyebrow">ANOTHER WAY TO MOVE</span><h2>CONSIDER <em>THIS.</em></h2></div></div><div className="products-grid">{upsells.map((p, i) => <ProductCard product={p} index={i} key={p.slug} />)}</div></div>}
    {guideOpen && <div className="pdp-guide-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setGuideOpen(false); }}><div className="pdp-guide-dialog" role="dialog" aria-modal="true" aria-label="Size guide"><div className="pdp-guide-head"><h2>FIND YOUR FIT.</h2><button type="button" onClick={() => setGuideOpen(false)} aria-label="Close size guide">×</button></div><SizeGuideContent productCategory={product.category} /><Link href="/size-guide" className="text-link">OPEN FULL SIZE GUIDE ↗</Link></div></div>}
  </div>;
}
