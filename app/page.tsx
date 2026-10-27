"use client";

import Link from "next/link";
import ProductCard from "@/components/product-card";
import HomeHeroSlider from "@/components/home-hero-slider";
import { useStore } from "@/components/store-provider";
import { asset } from "@/lib/asset";
import "./home.css";

const homeImage = (name: string) => asset(`/images/home/${name}`);
const collections = [
  { label: "Sports bras", href: "/shop/sports-bras", image: "Ignyte-Sports-Bras-Vertical.jpg" },
  { label: "Tops", href: "/shop/tops", image: "Ignyte-Tops-Vertical.jpg" },
  { label: "Leggings", href: "/shop/leggings", image: "Ignyte-Leggings-Vertical.jpg" },
  { label: "Shorts", href: "/shop/shorts", image: "Ignyte-Shorts-Vertical.jpg" },
];

export default function Home() {
  const { products } = useStore();
  return <div className="home-page" id="top">
    <HomeHeroSlider />
    <section className="home-products home-container" aria-labelledby="new-arrivals-title">
      <div className="home-section-head"><h2 id="new-arrivals-title">SHOP NEW ARRIVALS_</h2><Link href="/shop">View all ↗</Link></div>
      <div className="home-products-grid">{products.slice(0, 4).map((product, index) => <ProductCard key={product.slug} product={product} index={index} />)}</div>
    </section>
    <section className="home-feature" aria-labelledby="bras-title">
      <img src={homeImage("Ignyte-Support-Bras.jpg")} alt="Athlete wearing a supportive Ignyte sports bra" loading="lazy" />
      <div className="home-feature-copy"><span className="home-kicker">HIGH-IMPACT SUPPORT BRAS ↘</span><h2 id="bras-title">Feel the burn.<br />Not the bounce.</h2><Link href="/shop/sports-bras" className="home-pill">SHOP BRAS <span>↗</span></Link></div>
    </section>
    <section className="home-story home-container" id="story"><div><span className="home-kicker">IGNYTE® ACTIVEWEAR ↘</span><h2>High-performance gear for women who bring the fire.</h2></div><div><p>We’re here for those who bring the fire to their training and expect their gear to match it. Discover what makes Ignyte different.</p><Link href="/shop" className="home-underlined">EXPLORE IGNYTE ↗</Link></div></section>
    <section className="home-values home-container" aria-label="Why Ignyte"><div><span>↘</span><h3>No distractions</h3><p>Designed to stay put, feel secure, and let you focus on the work.</p></div><div><span>↘</span><h3>Moves with you</h3><p>Flexible support that responds to every rep, hold, stretch, and session.</p></div><div><span>↘</span><h3>Tested in real training</h3><p>Built for sweat, pressure, and repeat wear.</p></div></section>
    <section className="home-collections home-container" id="collections"><div className="home-section-head"><h2>FIND YOUR FIRE_</h2><Link href="/shop">Shop all ↗</Link></div><div className="home-collection-grid">{collections.map((collection) => <Link href={collection.href} className="home-collection" key={collection.label}><img src={homeImage(collection.image)} alt={`${collection.label} collection`} loading="lazy" /><div><h3>{collection.label}</h3><span>SHOP NOW ↗</span></div></Link>)}</div></section>
    <section className="home-bottom" aria-labelledby="bottom-title"><img src={homeImage("Home-Hero-Alt-2.jpg")} alt="Ignyte athletes training together" loading="lazy" /><div><span className="home-kicker">BRING THE FIRE_</span><h2 id="bottom-title">Your next move starts here.</h2><Link href="/shop" className="home-pill">SHOP THE COLLECTION <span>↗</span></Link></div></section>
  </div>;
}
