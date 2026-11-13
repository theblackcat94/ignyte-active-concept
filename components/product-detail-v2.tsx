"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { type Product, money } from "@/lib/catalog";
import { commerceConfigured } from "@/lib/commerce";
import { useStore } from "./store-provider";
import ProductCard from "./product-card";
import HomeProductCarousel from "./home-product-carousel";
import StackedProductGallery from "./stacked-product-gallery";
import BuildYourSet from "./build-your-set";
import PdpSocialStrip from "./pdp-social-strip";
import SizeGuideContent from "./size-guide-content";
import { CurrencyEstimate } from "./currency-estimate";
import { compareProductColours, productColourHex } from "@/lib/product-colors";
import { distinctAvailableProducts, pairedProducts, youMayAlsoLikeProducts } from "@/lib/product-merchandising";
import { modelPortraits } from "@/data/model-details";
import { sockSizing } from "@/data/size-guide";
import { asset } from "@/lib/asset";
import HeartIcon from "./heart-icon";
import BrandFilm from "./brand-film";
import RegistrationMarks from "./registration-marks";
import { fabricCompositions } from "@/lib/fabric-composition";
import ProductReviews from "./product-reviews";
import PurchaseReassurance, { ReturnsIcon, ShippingIcon } from "./purchase-reassurance";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping-policy";
import ProductDescription from "./product-description";
import PdpEditShortcut from "./pdp-edit-shortcut";
import BrowseRecoveryPrompt from "./browse-recovery-prompt";
import { SUPPORT_LEVELS, supportGuidance, supportLevel } from "@/lib/support-level";
import "@/app/product-detail-v2.css";
import "@/app/browse-recovery.css";

const fitScale = ["RUNS SMALLER", "TRUE TO SIZE", "RUNS LARGER"] as const;
const fitLabels = ["Runs smaller", "True to size", "Runs larger"] as const;
function ThreePointIndicator({ labels, active, ariaLabel }: { labels: readonly string[]; active: (index: number) => boolean; ariaLabel: string }) {
  return <div className="pdp-three-point" role="img" aria-label={ariaLabel}>
    <div className="pdp-three-point-bars" aria-hidden="true">{labels.map((label, index) => <span key={label} className={active(index) ? "is-active" : ""} />)}</div>
    <div className="pdp-three-point-labels" aria-hidden="true">{labels.map(label => <span key={label}>{label}</span>)}</div>
  </div>;
}
function fitScalePosition(advice: string): number | null {
  const normalized = advice.trim().toLowerCase().replace(/[.!]+$/, "");
  if (normalized === "runs smaller" || normalized === "runs small") return 0;
  if (normalized === "true to size") return 1;
  if (normalized === "runs larger" || normalized === "runs large") return 2;
  return null;
}

export default function ProductDetail({ product: initialProduct }: { product: Product }) {
  const { products, addToBag, bag, bagOpen, wishlist, toggleWishlist, catalogLoading, catalogError } = useStore();
  const product = !catalogLoading && !catalogError ? products.find(item => item.slug === initialProduct.slug) ?? initialProduct : initialProduct;
  useEffect(() => {
    try {
      const key = "ignyte-recently-viewed";
      const old = JSON.parse(sessionStorage.getItem(key) || "[]") as string[];
      sessionStorage.setItem(key, JSON.stringify([initialProduct.slug, ...old.filter(slug => slug !== initialProduct.slug)].slice(0, 10)));
    } catch { /* Browsing remains available without session storage. */ }
  }, [initialProduct.slug]);
  const [selection, setSelection] = useState({ slug: product.slug, size: "" });
  const [openInfo, setOpenInfo] = useState<string[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [fitTipSlug, setFitTipSlug] = useState<string | null>(null);
  const fitTipRef = useRef<HTMLSpanElement>(null);
  const [showMobilePurchase, setShowMobilePurchase] = useState(false);
  const [showDesktopPurchase, setShowDesktopPurchase] = useState(false);
  const [added, setAdded] = useState(false);
  const [savePulse, setSavePulse] = useState(false);
  useEffect(() => { if (!added) return; const timer = window.setTimeout(() => setAdded(false), 1400); return () => window.clearTimeout(timer); }, [added]);
  useEffect(() => { if (!savePulse) return; const timer = window.setTimeout(() => setSavePulse(false), 350); return () => window.clearTimeout(timer); }, [savePulse]);
  const sizeRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const related = distinctAvailableProducts(pairedProducts(product.slug, products, "related"), [product]);
  const upsells = distinctAvailableProducts(pairedProducts(product.slug, products, "upsell"), [product, ...related]);
  const alsoLike = youMayAlsoLikeProducts(product, products, [...related, ...upsells]);
  const colours = [product, ...products.filter(p => p.slug !== product.slug && p.name === product.name && p.category === product.category)]
    .filter((item, index, all) => all.findIndex(candidate => candidate.color.toLowerCase() === item.color.toLowerCase()) === index)
    .sort((a, b) => compareProductColours(a.color, b.color));
  const isSock = product.name.toLowerCase().includes("sock");
  const showCareAdvice = product.category !== "accessories" && !isSock;
  const pdp = product.pdp;
  const fitAdvice = pdp.fit?.trim();
  const confirmedSupport = supportLevel(pdp.support_level);
  const fitPosition = !isSock && fitAdvice ? fitScalePosition(fitAdvice) : null;
  const fabricParts = fabricCompositions(pdp.fabric);
  const showFitDetails = isSock || Boolean(fitAdvice || product.fitAttribute || product.coverageAttribute);
  const showFabricDetails = fabricParts.length > 0 || showCareAdvice;
  const fitTipOpen = fitTipSlug === product.slug;
  useEffect(() => {
    if (!fitTipOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!fitTipRef.current?.contains(event.target as Node)) setFitTipSlug(null); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setFitTipSlug(null); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("pointerdown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [fitTipOpen]);
  const sizes: NonNullable<Product["variants"]> = product.variants ? product.variants : (isSock ? [sockSizing.variant] : ["XS", "S", "M", "L", "XL"]).map(value => ({ id: value, size: value, price: product.price, stock: commerceConfigured ? 0 : 1 }));
  const defaultSize = sizes.length === 1 && sizes[0].stock > 0 ? sizes[0].size : "";
  const size = selection.slug === product.slug && sizes.some(variant => variant.size === selection.size && variant.stock > 0) ? selection.size : defaultSize;
  const selectedVariant = sizes.find(variant => variant.size === size);
  const saleOriginalPrice = selectedVariant ? selectedVariant.originalPrice : product.originalPrice;
  const canAdd = Boolean(!catalogLoading && !catalogError && size && selectedVariant && selectedVariant.stock > 0);
  const addLabel = added ? "ADDED ✓" : catalogLoading ? "CHECKING STOCK" : catalogError ? "STOCK UNAVAILABLE" : !sizes.some(variant => variant.stock > 0) ? "SOLD OUT" : !size ? "SELECT A SIZE" : canAdd ? "ADD TO BAG" : product.variants ? "SOLD OUT" : "PREVIEW ONLY";
  const stickyAddLabel = added ? "ADDED ✓" : catalogLoading ? "CHECKING STOCK" : catalogError ? "STOCK UNAVAILABLE" : !sizes.some(variant => variant.stock > 0) ? "SOLD OUT" : "ADD TO BAG ↗";
  useEffect(() => {
    let cancelled = false;
    try {
      const pending = JSON.parse(sessionStorage.getItem("ignyte-pdp-colour-size") || "null") as { slug: string; size: string } | null;
      sessionStorage.removeItem("ignyte-pdp-colour-size");
      if (pending?.slug === product.slug && product.variants?.some(variant => variant.size === pending.size && variant.stock > 0)) {
        queueMicrotask(() => { if (!cancelled) setSelection({ slug: product.slug, size: pending.size }); });
      }
    } catch { /* Optional transition preference must not affect purchasing. */ }
    return () => { cancelled = true; };
  }, [product.slug, product.variants]);
  useEffect(() => {
    if (!guideOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setGuideOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [guideOpen]);
  useEffect(() => {
    const update = () => {
      const footerTop = document.querySelector("footer")?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      setShowMobilePurchase(window.scrollY > 1 && footerTop > window.innerHeight);
      const addBottom = addRef.current?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY;
      setShowDesktopPurchase(window.innerWidth > 900 && addBottom < 0 && footerTop > window.innerHeight);
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [product.slug]);
  function mobilePurchase() {
    if (!canAdd) { sizeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (addToBag(product.slug, size)) setAdded(true);
  }
  function addSelected() { if (size && addToBag(product.slug, size)) setAdded(true); }
  const sections = ["FEATURES", "DESIGNED FOR", "FIT & FABRIC", "MODEL DETAILS", "SIZE GUIDE", "DELIVERY & RETURNS"].filter(label =>
    label === "FEATURES" ? pdp.features.length || isSock : label === "DESIGNED FOR" ? pdp.activities.length : label === "MODEL DETAILS" ? Boolean(pdp.show_model_details && pdp.model_details.trim()) : true);

  function content(label: string) {
    if (label === "FEATURES") return <ul className="pdp-feature-list">{pdp.features.map(feature => <li key={feature}>{feature}</li>)}{isSock && <li>{sockSizing.productText}</li>}</ul>;
    if (label === "DESIGNED FOR") return <div className="pdp-activity-list">{pdp.activities.map(activity => <span key={activity}>{activity}</span>)}</div>;
    if (label === "FIT & FABRIC") return <div className="pdp-fit-fabric">
      {confirmedSupport && <section className="pdp-info-group"><h3>Support level</h3><p className="pdp-info-value">{confirmedSupport} support</p><ThreePointIndicator labels={SUPPORT_LEVELS.map(level => level.toUpperCase())} active={index => index <= SUPPORT_LEVELS.indexOf(confirmedSupport)} ariaLabel={`${confirmedSupport} support. ${supportGuidance[confirmedSupport]}`} /></section>}
      {showFitDetails && <section className="pdp-info-group"><h3>Fit &amp; sizing advice</h3>
        {fitPosition !== null && <><p className="pdp-info-value">{fitLabels[fitPosition]}</p><ThreePointIndicator labels={fitScale} active={index => index === fitPosition} ariaLabel={`IGNYTE sizing guidance: ${fitLabels[fitPosition]}`} /></>}
        {isSock && <p>{sockSizing.productText}</p>}
        {fitAdvice && fitPosition === null && <p>{fitAdvice}</p>}
        {product.fitAttribute && (!fitAdvice || product.fitAttribute.trim().toLowerCase() !== fitAdvice.toLowerCase()) && <p><span className="pdp-info-key">Fit:</span> {product.fitAttribute}</p>}
        {product.coverageAttribute && <p><span className="pdp-info-key">Coverage:</span> {product.coverageAttribute}</p>}
      </section>}
      {showFabricDetails && <section className="pdp-info-group"><h3>Fabric</h3>
        {fabricParts.length > 0 && <dl className="pdp-fabric-list">{fabricParts.map((part, index) => <div key={`${part.label}-${index}`}><dt>{part.label}</dt><dd>{part.composition}</dd></div>)}</dl>}
        {showCareAdvice && <p className="pdp-care-note"><strong>Care:</strong> {pdp.care_approved && pdp.care_instructions?.trim() ? pdp.care_instructions.trim() : "Machine wash cold at 30°C on a gentle cycle with similar colours. Air dry in the shade. Always follow the garment care label."}</p>}
      </section>}
      {pdp.oeko_certified && <section className="pdp-info-group pdp-certification"><h3>OEKO-TEX certification</h3><p><span className="pdp-certification-name">OEKO-TEX® STANDARD 100</span>Made with OEKO-TEX® STANDARD 100 certified fabrics, tested for harmful substances so you can feel confident in what’s against your skin.</p>{pdp.oeko_certificate_url?.trim() && <a href={pdp.oeko_certificate_url.trim()} target="_blank" rel="noopener noreferrer">View certificate{pdp.oeko_certificate.trim() ? ` ${pdp.oeko_certificate.trim()}` : ""} ↗</a>}</section>}
      {!confirmedSupport && !showFitDetails && !showFabricDetails && !pdp.oeko_certified && <p>Fit and fabric details are being confirmed for this product.</p>}
    </div>;
    if (label === "MODEL DETAILS") {
      const name = pdp.model_details.split("\n", 1)[0].trim();
      return <div className="pdp-model-block"><p className="pdp-model-details">{pdp.model_details}</p>{modelPortraits[name] && <Image className="pdp-model-portrait" src={asset(modelPortraits[name])} alt={`${name} wearing IGNYTE activewear`} width={164} height={164} sizes="82px" />}</div>;
    }
    if (label === "SIZE GUIDE") return <><SizeGuideContent productCategory={product.category} /><div className="pdp-size-guide-link"><Link className="text-link" href={isSock ? "/size-guide#socks" : "/size-guide"}>OPEN FULL SIZE GUIDE ↗</Link></div></>;
    return <div className="pdp-delivery">
      <section><span className="pdp-delivery-icon"><ShippingIcon /></span><div><strong>DELIVERY</strong><p>Free shipping on eligible Australian orders of AU${FREE_SHIPPING_THRESHOLD_CENTS / 100} or more after discounts. AU$15 below the threshold.</p><Link href="/returns#shipping">Shipping policy ↗</Link></div></section>
      <section><span className="pdp-delivery-icon"><ReturnsIcon /></span><div><strong>EASY 30 DAY RETURNS</strong><p>Eligible full-price items must arrive at our warehouse within 30 days. Sale merchandise is final sale for change-of-mind returns. Customers pay return postage; original shipping charges are non-refundable. Consumer law rights are unaffected.</p><Link href="/returns#returns">Returns policy ↗</Link></div></section>
    </div>;
  }

  return <div className={`product-page pdp-stacked section-wrap${(showMobilePurchase || showDesktopPurchase) && !bagOpen && !guideOpen ? " has-sticky-purchase" : ""}`}>
    <BrowseRecoveryPrompt slug={product.slug} bagHasProduct={bag.some(item => item.slug === product.slug)} />
    <div className="detail-grid"><div><StackedProductGallery product={product} /></div><div className="detail-info" tabIndex={0} aria-label="Product details and purchase options"><div className="pdp-breadcrumb-row"><div className="breadcrumb pdp-detail-breadcrumb"><Link href="/">IGNYTE</Link><span>/</span><Link href={`/shop/${product.category}`}>{product.category.toUpperCase().replace("-", " ")}</Link><span>/</span><span>{product.name.toUpperCase()}</span></div><PdpEditShortcut slug={product.slug} /></div><div className="pdp-title-row"><h1>{product.name.toUpperCase()}<em>.</em></h1><button type="button" className={`pdp-title-wishlist${savePulse ? " just-saved" : ""}`} aria-label={wishlist.includes(product.slug) ? "Remove from wishlist" : "Save to wishlist"} aria-pressed={wishlist.includes(product.slug)} onClick={() => { if (!wishlist.includes(product.slug)) setSavePulse(true); toggleWishlist(product.slug); }}><HeartIcon filled={wishlist.includes(product.slug)} /></button></div>
      <div className="detail-price">{saleOriginalPrice && <del>{money(saleOriginalPrice)}</del>}<span>{money(selectedVariant?.price ?? product.price)}<CurrencyEstimate aud={selectedVariant?.price ?? product.price} /></span></div>
      {saleOriginalPrice && <p className="pdp-sale-returns-note">SALE ITEM · FINAL SALE FOR CHANGE-OF-MIND RETURNS. <Link href="/returns/#returns">RETURNS POLICY ↗</Link></p>}
      <ProductDescription key={product.slug} description={product.description} />{commerceConfigured && !product.variants && <p className="catalog-preview-note">Preview item. Available to order after sizes and stock are confirmed.</p>}
      <div className="detail-color">COLOUR: <strong>{product.color.toUpperCase()}</strong></div>
      <div className="pdp-colour-options" aria-label={`Available ${product.name} colours`}>
        {colours.map(option => <Link key={option.slug} href={`/product/${option.slug}/`} scroll={false} prefetch className={`pdp-colour-option ${option.slug === product.slug ? "selected" : ""}`} aria-label={`${option.color}${option.slug === product.slug ? ", selected" : ""}`} aria-current={option.slug === product.slug ? "page" : undefined} title={option.color} onPointerEnter={() => { const image = new window.Image(); image.src = option.image; }} onClick={() => { if (option.slug === product.slug) return; try { sessionStorage.setItem("ignyte-pdp-colour-size", JSON.stringify({ slug: option.slug, size })); } catch {} }}>
          <span className={`pdp-colour-swatch ${option.color.toLowerCase() === "white" ? "is-white" : ""}`} style={{ backgroundColor: productColourHex(option.color) ?? "#D6D1CB" }} />
          <span>{option.color.toUpperCase()}</span>
        </Link>)}
      </div>
      <div className="size-heading"><span>SELECT SIZE</span><button type="button" onClick={() => setGuideOpen(true)}>SIZE GUIDE ↗</button></div>
      <div className="size-grid" ref={sizeRef}>{sizes.map(variant => <button type="button" className={size === variant.size ? "selected" : ""} aria-pressed={size === variant.size} aria-label={`${variant.size}${variant.stock <= 0 ? ", out of stock" : ""}`} disabled={variant.stock <= 0} onClick={() => setSelection({ slug: product.slug, size: variant.size })} key={variant.id}>{variant.size}</button>)}</div>
      {isSock ? <p className="pdp-sock-size-note">{sockSizing.productText}</p> : fitPosition !== null && <div className="pdp-fit-confidence"><span>Our fit advice</span><strong>{fitLabels[fitPosition]}</strong><span ref={fitTipRef} className={`pdp-fit-info ${fitTipOpen ? "is-open" : ""}`}><button type="button" aria-label="About our fit advice" aria-describedby="pdp-fit-tooltip" aria-expanded={fitTipOpen} onClick={() => setFitTipSlug(open => open === product.slug ? null : product.slug)}>ⓘ</button><span id="pdp-fit-tooltip" className="pdp-fit-tooltip" role="tooltip">IGNYTE&apos;s own product fit guidance, based on our assessment, not customer reviews.</span></span></div>}
      <button type="button" ref={addRef} className={`button button-orange detail-add${added ? " is-added" : ""}`} onClick={addSelected} disabled={!canAdd}>{addLabel}<span>↗</span></button>
      <PurchaseReassurance />
      <BuildYourSet bra={product} braSize={size} />
      <div className="detail-accordions">{sections.map(label => <div key={label} id={label === "FIT & FABRIC" ? "pdp-fit-fabric" : undefined}><button type="button" aria-expanded={openInfo.includes(label)} onClick={() => setOpenInfo(current => current.includes(label) ? current.filter(item => item !== label) : [...current, label])}>{label}<span>{openInfo.includes(label) ? "−" : "+"}</span></button>{openInfo.includes(label) && content(label)}</div>)}</div>
    </div></div>
    {related.length > 0 && <div className="related-section pdp-recommendations"><div className="section-heading"><div><span className="eyebrow">COMPLETE YOUR EDIT</span><h2>PAIR IT <em>WITH.</em></h2></div><Link href="/shop" className="text-link">SHOP ALL ↗</Link></div><div className="products-grid">{related.map((p, i) => <ProductCard product={p} index={i} key={p.slug} showOptions />)}</div></div>}
    {upsells.length > 0 && <div className="related-section pdp-recommendations"><div className="section-heading"><div><span className="eyebrow">ANOTHER WAY TO MOVE</span><h2>CONSIDER <em>THIS.</em></h2></div></div><div className="products-grid">{upsells.map((p, i) => <ProductCard product={p} index={i} key={p.slug} showOptions />)}</div></div>}
    <div className="pdp-brand-callout"><RegistrationMarks /><div className="pdp-brand-copy"><span className="eyebrow">PERFORMANCE MEETS EXPRESSION ↘</span><h2>Built for the burn<sup>™</sup></h2><p>For women who train with purpose and express themselves with confidence. From the first warm-up to the final rep, bring your energy and make every session your own.</p><Link href="/about" className="button button-dark pdp-brand-about">MEET IGNYTE ↗</Link></div><BrandFilm label="IGNYTE Built for the Burn brand film" /></div>
    {pdp.show_brand_story && <div className="pdp-story"><section><span className="pdp-story-icon" aria-hidden="true">↘</span><h2>Made for movement</h2><p>Fit, feel and freedom of movement guide the details, from warm-up to final rep.</p></section><section><span className="pdp-story-icon" aria-hidden="true">↘</span><h2>Tested in real training</h2><p>Built for sweat, pressure, and repeat wear.</p></section><section><span className="pdp-story-icon" aria-hidden="true">↘</span><h2>No distractions</h2><p>Designed to stay put, feel secure and let you focus on the work.</p></section></div>}
    {alsoLike.length > 0 && <section className="related-section pdp-also-like" aria-labelledby="pdp-also-like-heading"><div className="section-heading"><div><span className="eyebrow">MORE TO MOVE IN</span><h2 id="pdp-also-like-heading">YOU MAY ALSO <em>LIKE_</em></h2></div><Link href="/shop" className="text-link">SHOP ALL ↗</Link></div><HomeProductCarousel products={alsoLike} label={`You may also like for ${product.name}`} /></section>}
    <ProductReviews productSlug={product.slug} />
    <PdpSocialStrip productSlug={product.slug} />
    {showMobilePurchase && !guideOpen && !bagOpen && <div className="pdp-mobile-purchase" role="region" aria-label="Sticky purchase controls"><div className="pdp-mobile-purchase-summary"><span>{product.name} · {product.color}</span><strong>{size || "Choose size"} · {money(selectedVariant?.price ?? product.price)}</strong></div><button type="button" onClick={mobilePurchase} disabled={catalogLoading || catalogError || !sizes.some(variant => variant.stock > 0)} aria-label={size ? `Add ${product.name} in ${product.color}, size ${size}, to bag` : `Choose a size before adding ${product.name} to bag`}>{stickyAddLabel}</button></div>}
    {showDesktopPurchase && !guideOpen && !bagOpen && <div className="pdp-desktop-purchase" role="region" aria-label="Sticky desktop purchase controls"><div className="pdp-desktop-purchase-inner"><div className="pdp-desktop-purchase-summary"><strong>{product.name}</strong><span>{product.color} · {money(selectedVariant?.price ?? product.price)}</span></div><div className="pdp-desktop-purchase-sizes" role="group" aria-label={`Choose ${product.name} size in sticky bar`}>{sizes.map(variant => <button type="button" key={variant.id} disabled={variant.stock <= 0} aria-pressed={size === variant.size} aria-label={`${variant.size}${variant.stock <= 0 ? ", out of stock" : ""}`} onClick={() => setSelection({ slug: product.slug, size: variant.size })}>{variant.size}</button>)}</div><button type="button" className={`pdp-desktop-purchase-add${added ? " is-added" : ""}`} disabled={!canAdd} onClick={addSelected}>{addLabel} ↗</button></div></div>}
    {guideOpen && <div className="pdp-guide-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setGuideOpen(false); }}><div className="pdp-guide-dialog" role="dialog" aria-modal="true" aria-label="Size guide"><div className="pdp-guide-head"><h2>FIND YOUR FIT.</h2><button type="button" onClick={() => setGuideOpen(false)} aria-label="Close size guide">×</button></div><SizeGuideContent productCategory={product.category} /><Link href={isSock ? "/size-guide#socks" : "/size-guide"} className="text-link">OPEN FULL SIZE GUIDE ↗</Link></div></div>}
  </div>;
}
