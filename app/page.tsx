"use client";

import Link from "next/link";
import HomeProductCarousel from "@/components/home-product-carousel";
import HomeHeroSlider from "@/components/home-hero-slider";
import PdpSocialStrip from "@/components/pdp-social-strip";
import FeatureArrow from "@/components/feature-arrow";
import BrandFilm from "@/components/brand-film";
import RegistrationMarks from "@/components/registration-marks";
import { homeBestSellerSlugs } from "@/data/pdp-planner";
import { useStore } from "@/components/store-provider";
import { asset } from "@/lib/asset";
import "./home.css";

const homeImage = (name: string) => asset(`/images/home/${name}`);
const featuredCover: Record<string, string> = {
  "sports-bras": "Ignyte-Sports-Bras-Vertical.jpg", tops: "Ignyte-Tops-Vertical.jpg",
  leggings: "Ignyte-Leggings-Vertical.jpg", shorts: "Ignyte-Shorts-Vertical.jpg",
};

export default function Home() {
  const { products, categories, catalogPreview } = useStore();
  const collections = categories.filter(category => category.id !== "all").slice(0, 4);
  const apparel = products.filter(product => product.category !== "accessories" && !product.slug.includes("socks"));
  const bestSellers = apparel.filter(product => product.pdp.featured_best_seller).sort((a, b) => {
    const rank = (slug: string) => { const index = homeBestSellerSlugs.indexOf(slug); return index < 0 ? 999 : index; };
    return rank(a.slug) - rank(b.slug);
  });
  const fitCards = [
    { name: "RELAXED FIT", copy: "Lightweight shorts with an inner short and a zip pocket for small essentials.", action: "SHOP SHORTS ↗", category: "shorts", slug: "all-in-motion-shorts-black" },
    { name: "CLOSE FIT", copy: "Bike shorts with a crossover waistband and a supportive, compressive feel.", action: "SHOP SHORTS ↗", category: "shorts", slug: "sculpt-shorts-mauve" },
    { name: "FULL-LENGTH COVERAGE", copy: "High-waisted leggings with seamless knit construction and soft stretch.", action: "SHOP LEGGINGS ↗", category: "leggings", slug: "seamless-legging-lavender" },
  ].map(card => ({ ...card, product: products.find(product => product.slug === card.slug) }));
  return <div className="home-page" id="top">
    <HomeHeroSlider />
    <section className="home-products home-container" aria-labelledby="new-arrivals-title">
      <div className="home-section-head"><h2 id="new-arrivals-title">SHOP NEW ARRIVALS_</h2><Link href="/shop">SHOP ALL ↗</Link></div>
      {catalogPreview && <p className="catalog-preview-note">Collection preview. Ordering opens when product sizes and stock are confirmed.</p>}
      <HomeProductCarousel products={apparel.slice(0, 8)} label="New arrivals" />
    </section>
    <section className="home-feature" aria-labelledby="bras-title">
      <img src={homeImage("Home-Hero-Alt-3.jpg")} alt="Athlete wearing an Ignyte sports bra while training" loading="lazy" />
      <RegistrationMarks />
      <div className="home-feature-copy"><span className="home-kicker">HIGH-IMPACT SUPPORT BRAS ↘</span><h2 id="bras-title">Feel the burn.<br />Not the bounce.</h2><Link href="/shop/sports-bras" className="home-pill">SHOP BRAS <span>↗</span></Link></div>
    </section>
    <section className="home-story home-container" id="story"><div><span className="home-kicker">IGNYTE® ACTIVEWEAR ↘</span><h2><span className="home-story-keep">High-performance</span> gear for women who bring the fire.</h2></div><div><p>We’re here for those who bring the fire to their training and expect their gear to match it. Discover what makes Ignyte different.</p><Link href="/about" className="home-underlined">EXPLORE IGNYTE ↗</Link></div></section>
    <section className="home-values home-container" aria-label="Why Ignyte"><div><FeatureArrow /><h3>No distractions</h3><p>Designed to stay put, feel secure, and let you focus on the work.</p></div><div><FeatureArrow /><h3>Moves with you</h3><p>Flexible support that responds to every rep, hold, stretch, and session.</p></div><div><FeatureArrow /><h3>Tested in real training</h3><p>Built for sweat, pressure, and repeat wear.</p></div></section>
    <section className="home-collections home-container" id="collections"><div className="home-section-head"><h2>SHOP CATEGORIES_</h2><Link href="/shop">SHOP ALL ↗</Link></div><div className="home-collection-grid">{collections.map((collection) => <Link href={`/shop/${collection.id}`} className="home-collection" key={collection.id}><img src={featuredCover[collection.id] ? homeImage(featuredCover[collection.id]) : collection.cover} alt={`${collection.label} collection`} loading="lazy" /><div><h3>{collection.label}</h3><span>SHOP NOW ↗</span></div></Link>)}</div></section>
    <section className="home-fit home-container" aria-labelledby="find-fit-title"><div className="home-section-head"><h2 id="find-fit-title">FIND YOUR FIT_</h2></div><div className="home-fit-grid">{fitCards.map(({ name, copy, action, category, product }) => product && <article className="home-fit-card" key={name}><Link href={`/shop/${category}`} className="home-fit-image" aria-label={`Shop ${name.toLowerCase()} ${category}`}><img src={product.image} alt={`${product.name} in ${product.color}`} loading="lazy" /><RegistrationMarks /></Link><h3>{name}</h3><p>{copy}</p><Link href={`/shop/${category}`} className="home-underlined">{action}</Link></article>)}</div></section>
    <section className="home-bottom" aria-labelledby="bottom-title"><div className="home-bottom-copy"><span className="home-kicker">BRING THE FIRE_</span><h2 id="bottom-title">See IGNYTE in motion.</h2><Link href="/shop" className="home-pill">SHOP THE COLLECTION <span>↗</span></Link></div><BrandFilm label="IGNYTE brand film" /><img className="home-bottom-photo" src={homeImage("Home-Hero-Alt-2-v2.jpg")} alt="Two IGNYTE athletes in the gym" loading="lazy" /></section>
    <section className="home-founders home-container" aria-labelledby="home-founders-title"><img className="home-founders-logo" src={homeImage("ignyte-founder-badge.svg")} alt="IGNYTE Built for the Burn badge" /><div className="home-founders-copy"><span className="home-kicker">FROM THE FOUNDERS ↘</span><h2 id="home-founders-title">The belief behind the brand</h2><p>Founded in 2026, IGNYTE began with the belief that women shouldn’t have to choose between performance and self-expression. Our founders set out to create activewear that supports hard training while giving you the confidence to make it your own.</p><Link href="/about" className="home-underlined">MEET IGNYTE ↗</Link></div></section>
    {bestSellers.length > 0 && <section className="home-products home-container" aria-labelledby="best-sellers-title"><div className="home-section-head"><h2 id="best-sellers-title">THE IGNYTE EDIT_</h2><Link href="/shop">SHOP ALL ↗</Link></div><HomeProductCarousel products={bestSellers} label="The Ignyte Edit" /></section>}
    <div className="home-container"><PdpSocialStrip /></div>
  </div>;
}
