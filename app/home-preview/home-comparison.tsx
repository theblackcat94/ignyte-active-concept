"use client";

import Link from "next/link";
import HomeProductCarousel from "@/components/home-product-carousel";
import HomeHeroSlider from "@/components/home-hero-slider";
import PdpSocialStrip from "@/components/pdp-social-strip";
import TrainingFilmExcerpt from "@/components/training-film-excerpt";
import FeatureArrow from "@/components/feature-arrow";
import { homeBestSellerSlugs } from "@/data/pdp-planner";
import { useStore } from "@/components/store-provider";
import { asset } from "@/lib/asset";
import "../home.css";
import "./home-comparison.css";

const homeImage = (name: string) => asset(`/images/home/${name}`);
const featuredCover: Record<string, string> = {
  "sports-bras": "Ignyte-Sports-Bras-Vertical.jpg", tops: "Ignyte-Tops-Vertical.jpg",
  leggings: "Ignyte-Leggings-Vertical.jpg", shorts: "Ignyte-Shorts-Vertical.jpg",
};
const fitOptions = [
  { slug: "all-in-motion-shorts-black", name: "All In Motion Shorts", question: "Prefer a relaxed fit?", copy: "Lightweight shorts with an inner short and a zip pocket for small essentials." },
  { slug: "sculpt-shorts-black", name: "Sculpt Shorts", question: "Like a close fit?", copy: "Bike shorts with a crossover waistband and a supportive, compressive feel." },
  { slug: "seamless-legging-espresso", name: "Seamless Leggings", question: "Want full-length coverage?", copy: "High-waisted leggings with seamless knit construction and soft stretch." },
];

export default function HomeComparison() {
  const { products, categories, catalogPreview } = useStore();
  const collections = categories.filter(category => category.id !== "all").slice(0, 4);
  const apparel = products.filter(product => product.category !== "accessories" && !product.slug.includes("socks"));
  const bestSellers = apparel.filter(product => product.pdp.featured_best_seller).sort((a, b) => {
    const rank = (slug: string) => { const index = homeBestSellerSlugs.indexOf(slug); return index < 0 ? 999 : index; };
    return rank(a.slug) - rank(b.slug);
  });
  return <div className="home-page home-comparison" id="top">
    <HomeHeroSlider comparison />
    <section className="home-products home-container" aria-labelledby="new-arrivals-title">
      <div className="home-section-head"><h2 id="new-arrivals-title">SHOP NEW ARRIVALS_</h2><Link href="/shop">SHOP ALL ↗</Link></div>
      {catalogPreview && <p className="catalog-preview-note">Collection preview. Ordering opens when product sizes and stock are confirmed.</p>}
      <HomeProductCarousel products={apparel.slice(0, 8)} label="New arrivals" />
      <div className="comparison-reassurance" aria-label="Shipping, returns and sizing">
        <Link href="/returns">Free Australian shipping on orders of AU$100 or more after discounts ↗</Link>
        <Link href="/returns">Australian returns: contact us before sending an item back ↗</Link>
        <Link href="/size-guide">Find your size ↗</Link>
      </div>
    </section>
    <section className="home-feature" aria-labelledby="bras-title"><img src={homeImage("Home-Hero-Alt-3.jpg")} alt="Athlete wearing an Ignyte sports bra while training" loading="lazy" /><div className="home-feature-copy"><span className="home-kicker">HIGH-IMPACT SUPPORT BRAS ↘</span><h2 id="bras-title">Feel the burn.<br />Not the bounce.</h2><Link href="/shop/sports-bras" className="home-pill">SHOP BRAS <span>↗</span></Link></div></section>
    <section className="home-story home-container" id="story"><div><span className="home-kicker">IGNYTE® ACTIVEWEAR ↘</span><h2>Take your training seriously. Make it your own.</h2></div><div><p>IGNYTE Active brings performance and self-expression together. Activewear for women who train with purpose and bring their own energy to every session.</p><Link href="/about" className="home-underlined">MEET IGNYTE ↗</Link></div></section>
    <section className="home-values home-container" aria-label="Why Ignyte"><div><FeatureArrow /><h3>No distractions</h3><p>Designed to stay put, feel secure, and let you focus on the work.</p></div><div><FeatureArrow /><h3>Moves with you</h3><p>Flexible support that responds to every rep, hold, stretch, and session.</p></div><div><FeatureArrow /><h3>Tested in real training</h3><p>Built for sweat, pressure, and repeat wear.</p></div></section>
    <section className="home-collections home-container" id="collections"><div className="home-section-head"><h2>Find your next favourite.</h2><Link href="/shop">SHOP ALL ↗</Link></div><div className="home-collection-grid">{collections.map(collection => <Link href={`/shop/${collection.id}`} className="home-collection" key={collection.id}><img src={featuredCover[collection.id] ? homeImage(featuredCover[collection.id]) : collection.cover} alt={`${collection.label} collection`} loading="lazy" /><div><h3>{collection.label}</h3><span>SHOP NOW ↗</span></div></Link>)}</div></section>
    <section className="comparison-fit home-container" aria-labelledby="fit-title"><div className="home-section-head"><h2 id="fit-title">Find your fit for training.</h2></div><div className="comparison-fit-grid">{fitOptions.map(option => { const product = products.find(item => item.slug === option.slug); if (!product) return null; return <article key={option.slug}><Link href={`/product/${product.slug}/`} aria-label={`View ${product.name}`}><img src={product.image} alt={`${product.name} in ${product.color}`} loading="lazy" /></Link><div><h3>{option.name}</h3><p><strong>{option.question}</strong> {option.copy}</p><Link href={`/product/${product.slug}/`}>SHOP {option.name.toUpperCase()} ↗</Link></div></article>; })}</div></section>
    <section className="comparison-motion" aria-labelledby="motion-title"><div className="home-container"><div><span className="home-kicker">TRAINING IN REAL TIME ↘</span><h2 id="motion-title">See the fit in motion.</h2><p>Vyper Sports Bra in black, shown during boxing training.</p><Link href="/product/vyper-sports-bra-black/" className="home-underlined">VIEW VYPER SPORTS BRA ↗</Link></div><TrainingFilmExcerpt /></div></section>
    <section className="home-bottom" aria-labelledby="bottom-title"><img src={homeImage("Home-Hero-Alt-2-v2.jpg")} alt="Ignyte athletes training together" loading="lazy" /><div><span className="home-kicker">BRING THE FIRE_</span><h2 id="bottom-title">Your next move starts here.</h2><Link href="/shop" className="home-pill">SHOP THE COLLECTION <span>↗</span></Link></div></section>
    {bestSellers.length > 0 && <section className="home-products home-container" aria-labelledby="best-sellers-title"><div className="home-section-head"><div><h2 id="best-sellers-title">The IGNYTE Edit</h2><p>A few favourites from our first collection.</p></div><Link href="/shop">SHOP ALL ↗</Link></div><HomeProductCarousel products={bestSellers} label="The Ignyte Edit" /></section>}
    <section className="comparison-founder home-container" aria-labelledby="founder-title"><img src={asset("/images/about/Ignyte-About-Mission.jpg")} alt="Jade boxing in the Ignyte campaign" loading="lazy" /><div><span className="home-kicker">FROM THE FOUNDER ↘</span><h2 id="founder-title">Why we made IGNYTE.</h2><p>Jade wanted training gear that could work as hard as the women wearing it, while leaving room for their own style. IGNYTE brings thoughtful fit and expressive design together for the sessions that matter to you.</p><Link href="/about" className="home-underlined">MEET IGNYTE ↗</Link></div></section>
    <div className="home-container"><PdpSocialStrip hideEyebrow /></div>
  </div>;
}
