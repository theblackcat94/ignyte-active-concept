"use client";

import Link from "next/link";
import HomeProductCarousel from "@/components/home-product-carousel";
import HomeHeroSlider from "@/components/home-hero-slider";
import ShopTheLook from "@/components/shop-the-look";
import FeatureArrow from "@/components/feature-arrow";
import BrandFilm from "@/components/brand-film";
import PdpSocialStrip from "@/components/pdp-social-strip";
import RegistrationMarks from "@/components/registration-marks";
import { homeBestSellerSlugs } from "@/data/pdp-planner";
import { useStore } from "@/components/store-provider";
import { asset } from "@/lib/asset";
import { inStock } from "@/lib/product-merchandising";
import "@/app/home.css";

const homeImage = (name: string) => asset(`/images/home/${name}`);
const featuredCover: Record<string, string> = {
  "sports-bras": "Ignyte-Sports-Bras-Vertical.jpg", tops: "Ignyte-Tops-Vertical.jpg",
  leggings: "Ignyte-Leggings-Vertical.jpg", shorts: "Ignyte-Shorts-Vertical.jpg",
};

export default function HomeAlternative({ preview = false }: { preview?: boolean }) {
  const { products, categories, catalogLoading, catalogError } = useStore();
  const collections = ["sports-bras", "leggings", "shorts", "tops"].map(id => categories.find(category => category.id === id)).filter((category): category is (typeof categories)[number] => Boolean(category));
  const apparel = products.filter(product => product.category !== "accessories" && !product.slug.includes("socks"));
  const bestSellers = apparel.filter(product => product.pdp.featured_best_seller).sort((a, b) => {
    const rank = (slug: string) => { const index = homeBestSellerSlugs.indexOf(slug); return index < 0 ? 999 : index; };
    return rank(a.slug) - rank(b.slug);
  });
  const bestSellerSlugs = new Set(bestSellers.map(product => product.slug));
  const shopCategories = ["sports-bras", "leggings", "shorts", "tops"];
  const shopCandidates = shopCategories.map(category => {
    const names = [...new Set(apparel.filter(product => product.category === category && inStock(product)).map(product => product.name))];
    return names.map(name => apparel.filter(product => product.category === category && product.name === name && inStock(product)).sort((a, b) => Number(bestSellerSlugs.has(a.slug)) - Number(bestSellerSlugs.has(b.slug)))[0]);
  });
  const shopMix = Array.from({ length: Math.max(...shopCandidates.map(group => group.length), 0) }, (_, index) => shopCandidates.map(group => group[index])).flat().filter((product): product is (typeof apparel)[number] => Boolean(product)).slice(0, 12);
  const fitCards = [
    { name: "CLOSE FIT", copy: "Close-fitting styles across bras, tops, leggings and shorts.", action: "SHOP CLOSE FIT ↗", filterKey: "fit", filterValue: "Close fit", slug: "sculpt-shorts-mauve" },
    { name: "RELAXED FIT", copy: "Lightweight shorts with an inner short and a zip pocket for small essentials.", action: "SHOP RELAXED FIT ↗", filterKey: "fit", filterValue: "Relaxed fit", slug: "all-in-motion-shorts-black" },
    { name: "FULL LENGTH", copy: "High-waisted leggings with seamless knit construction and soft stretch.", action: "SHOP FULL LENGTH ↗", filterKey: "coverage", filterValue: "Full length", slug: "seamless-legging-lavender" },
  ].map(card => ({ ...card, product: products.find(product => product.slug === card.slug) }));
  return <div className="home-page home-alternative" id="top">
    {preview && <div className="home-alternative-banner">NEW HOMEPAGE PREVIEW <Link href="/home-original">VIEW ORIGINAL HOMEPAGE ↗</Link></div>}
    <HomeHeroSlider />
    <section className="home-collections home-container" id="collections" aria-labelledby="home-categories-title"><div className="home-section-head"><h2 id="home-categories-title" className="mono-section-heading">SHOP CATEGORIES_</h2><Link href="/shop">SHOP ALL ↗</Link></div><div className="home-collection-mosaic">{collections.map((collection) => <Link href={`/shop/${collection.id}`} className={`home-collection home-collection-${collection.id}`} key={collection.id} aria-label={`Shop ${collection.label}`}><img src={featuredCover[collection.id] ? homeImage(featuredCover[collection.id]) : collection.cover} alt="" loading="lazy" /><span className="home-collection-label"><span>{collection.label}</span><span aria-hidden="true">↗</span></span></Link>)}</div></section>
    {bestSellers.length > 0 && <section className="home-products home-container home-edit" aria-labelledby="best-sellers-title"><div className="home-section-head"><h2 id="best-sellers-title" className="mono-section-heading">THE IGNYTE EDIT_</h2><Link href="/shop">SHOP ALL ↗</Link></div><p className="home-edit-subcopy">Our favourites, ready for your next move.</p><HomeProductCarousel products={bestSellers} label="The Ignyte Edit" /></section>}
    <section className="home-story home-container" id="story"><div className="ignyte-fire-content"><div><span className="home-kicker">IGNYTE® ACTIVEWEAR ↘</span><h2><span className="home-story-keep">High-performance</span> gear for women who bring the fire.</h2></div><div><p>We’re here for those who bring the fire to their training and expect their gear to match it. Discover what makes Ignyte different.</p><Link href="/about" className="home-underlined">EXPLORE IGNYTE ↗</Link></div></div></section>
    <section className="home-values home-container" aria-label="Why Ignyte"><div><FeatureArrow /><h3>No distractions</h3><p>Designed to stay put, feel secure, and let you focus on the work.</p></div><div><FeatureArrow /><h3>Moves with you</h3><p>Flexible support that responds to every rep, hold, stretch, and session.</p></div><div><FeatureArrow /><h3>Tested in real training</h3><p>Built for sweat, pressure, and repeat wear.</p></div></section>
    <section className="home-fit home-container" aria-labelledby="find-fit-title"><div className="home-section-head"><h2 id="find-fit-title" className="mono-section-heading">FIND YOUR FIT_</h2></div><div className="home-fit-grid">{fitCards.map(({ name, copy, action, filterKey, filterValue, product }) => product && <Link className="home-fit-card" href={`/shop/?${new URLSearchParams({ [filterKey]: filterValue })}`} key={name} aria-label={`Shop ${name.toLowerCase()} products`}><span className="home-fit-image"><img src={product.image} alt={`${product.name} in ${product.color}`} loading="lazy" /><RegistrationMarks /></span><h3>{name}</h3><p>{copy}</p><span className="home-underlined">{action}</span></Link>)}</div></section>
    <section className="home-feature" aria-labelledby="alt-bras-title"><img src={homeImage("Home-Hero-Alt-3.jpg")} alt="Athlete wearing an Ignyte sports bra while training" loading="lazy" /><RegistrationMarks /><div className="home-feature-copy"><span className="home-kicker">HIGH-IMPACT SUPPORT BRAS ↘</span><h2 id="alt-bras-title">Feel the burn.<br />Not the bounce.</h2><Link href="/shop/sports-bras" className="home-pill">SHOP BRAS <span>↗</span></Link></div></section>
    <ShopTheLook products={products} />
    <section className="home-bottom" aria-labelledby="bottom-title"><RegistrationMarks /><div className="home-bottom-copy"><span className="home-kicker mono-section-heading">BUILT FOR THE BURN_</span><h2 id="bottom-title">See IGNYTE in motion.</h2><Link href="/shop" className="home-pill">SHOP THE COLLECTION <span>↗</span></Link></div><BrandFilm label="IGNYTE brand film" /><img className="home-bottom-photo" src={homeImage("Home-Hero-Alt-2-v2.jpg")} alt="Two IGNYTE athletes in the gym" loading="lazy" /></section>
    <section className="home-founders home-container" aria-labelledby="home-founders-title"><div className="home-founders-badge"><img className="home-founders-logo home-founders-logo-light" src={homeImage("ignyte-founder-badge.svg")} alt="IGNYTE Built for the Burn badge" /><img className="home-founders-logo home-founders-logo-dark" src={homeImage("ignyte-founder-badge-dark.svg")} alt="" aria-hidden="true" /></div><div className="home-founders-copy"><span className="home-kicker mono-section-heading">OUR STORY ↘</span><h2 id="home-founders-title">What fuels IGNYTE</h2><p>Founded in 2026, IGNYTE began with the belief that women shouldn’t have to choose between performance and self-expression. Our founders set out to create activewear that supports hard training while giving you the confidence to make it your own.</p><Link href="/about" className="home-underlined">MEET IGNYTE ↗</Link></div></section>
    <div className="home-container"><PdpSocialStrip /></div>
    {!catalogLoading && !catalogError && shopMix.length > 0 && <section className="home-products home-container home-shop-ignyte" aria-labelledby="shop-ignyte-title"><div className="home-section-head"><h2 id="shop-ignyte-title" className="mono-section-heading">SHOP IGNYTE_</h2><Link href="/shop">SHOP ALL ↗</Link></div><HomeProductCarousel products={shopMix} label="Shop Ignyte products" /></section>}
  </div>;
}
