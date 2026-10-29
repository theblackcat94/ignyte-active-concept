"use client";

import Link from "next/link";
import { useState } from "react";
import { money, products } from "@/lib/catalog";
import "./preview.css";

type Mode = "original" | "dark" | "ignyte";
const options: { id: Mode; label: string; description: string }[] = [
  { id: "original", label: "Original", description: "The current warm, light site styling" },
  { id: "dark", label: "Dark", description: "Night blue with light type and orange accents" },
  { id: "ignyte", label: "IGNYTE", description: "An expressive take on Bring the Fire" },
];
const featured = ["aura-halter-lavender", "all-in-motion-shorts-black", "seamless-legging-espresso"]
  .map(slug => products.find(product => product.slug === slug)).filter((product): product is (typeof products)[number] => Boolean(product));

export default function AppearancePreview() {
  const [mode, setMode] = useState<Mode>("original");
  const [size, setSize] = useState("M");
  const [message, setMessage] = useState("");
  const pdp = featured[0];
  return <main className={`appearance-preview appearance-${mode}`}>
    <div className="appearance-toolbar"><div><span>IGNYTE / DESIGN REVIEW</span><h1>Appearance modes</h1><p>Choose a mode to compare representative store elements. The live site remains in its original appearance.</p></div><div className="appearance-options" role="group" aria-label="Appearance mode">{options.map(option => <button type="button" key={option.id} aria-pressed={mode === option.id} onClick={() => setMode(option.id)}><strong>{option.label}</strong><small>{option.description}</small></button>)}</div></div>
    <div className="appearance-canvas">
      <nav className="appearance-nav" aria-label="Preview navigation"><span className="appearance-mark">✦ IGNYTE</span><div><Link href="/shop">SHOP ALL</Link><Link href="/shop/shorts">SHORTS</Link><Link href="/about">ABOUT</Link></div><span>BAG 00</span></nav>
      <section className="appearance-intro"><span className="appearance-flame" aria-hidden="true">✦</span><span className="appearance-eyebrow">BUILT FOR THE BURN_</span><h2>Bring your <em>fire.</em></h2><p>Training gear made to move with you, from the first warm-up to the final rep.</p><Link className="appearance-primary" href="/shop">EXPLORE THE COLLECTION ↗</Link></section>
      <section className="appearance-products"><div className="appearance-section-head"><h2>SHOP THE EDIT_</h2><span>01 / 03</span></div><div className="appearance-product-grid">{featured.map(product => <article key={product.slug}><Link href={`/product/${product.slug}/`}><img src={product.image} alt={`${product.name} in ${product.color}`} /></Link><div><span>{product.category.toUpperCase()} / {product.color.toUpperCase()}</span><h3>{product.name}</h3><strong>{money(product.price)}</strong></div></article>)}</div></section>
      {pdp && <section className="appearance-pdp"><img src={pdp.image} alt={`${pdp.name} in ${pdp.color}`} /><div><span className="appearance-eyebrow">IGNYTE / TOPS</span><h2>{pdp.name}<em>.</em></h2><strong>{money(pdp.price)}</strong><p>{pdp.description}</p><span className="appearance-label">COLOUR: {pdp.color.toUpperCase()}</span><span className="appearance-label">SELECT SIZE</span><div className="appearance-sizes">{["S", "M", "L"].map(value => <button type="button" key={value} aria-pressed={size === value} onClick={() => setSize(value)}>{value}</button>)}</div><button type="button" className="appearance-primary" onClick={() => setMessage("Visual preview only — no item was added.")}>ADD TO BAG ↗</button><small role="status">{message}</small><div className="appearance-benefits"><span>✦ Free shipping on AU orders $100 or more</span><span>✦ Fast, easy returns</span></div></div></section>}
      <footer className="appearance-footer"><div><span className="appearance-mark">✦ IGNYTE</span><p>High-performance activewear for women who bring the fire.</p></div><div><span>EXPLORE</span><Link href="/shop">Shop all</Link><Link href="/about">Our story</Link></div><div><span>HELP</span><Link href="/returns">Returns</Link><Link href="/size-guide">Size guide</Link></div><small>Branding + Website by JUST Creative</small></footer>
    </div>
  </main>;
}
