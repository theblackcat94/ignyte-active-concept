import Link from "next/link";
import type { Metadata } from "next";
import FeatureArrow from "@/components/feature-arrow";
import "./about.css";

export const metadata: Metadata = { title: "About Ignyte Active | Built for the Burn", description: "Meet Ignyte Active, the activewear brand bringing performance and self-expression together. Discover our purpose and what it means to bring your own fire." };

export default function AboutPage() {
  return <div className="about-page">
    <section className="about-hero">
      <img src="/images/about/About-Hero-1.webp" alt="Ignyte athlete training with battle ropes" />
      <div><span className="eyebrow">IGNYTE® ACTIVEWEAR ↘</span><h1>High-performance gear<br className="about-hero-desktop-break" /> for women who train with intent<span>.</span></h1><p>IGNYTE brings together training, style and individuality. For women who love a challenge and bring their own energy to every session.</p></div>
    </section>
    <section className="about-features section-wrap">
      <div><FeatureArrow /><h2>No distractions</h2><p>Designed to stay put, feel secure, and let you focus on the work.</p></div>
      <div><FeatureArrow /><h2>Moves with you</h2><p>Flexible support that responds to every rep, hold, stretch, and session.</p></div>
      <div><FeatureArrow /><h2>Tested in real training</h2><p>Built for sweat, pressure, and repeat wear.</p></div>
    </section>
    <section className="about-mission section-wrap">
      <div><span className="eyebrow">OUR MISSION ↘</span><h2>To inspire women<br />to <em>bring the fire.</em></h2><p>We believe strength and self-expression belong together.</p><p>The determination to try something harder. The confidence to wear what you love. The satisfaction of a strong session, shared with people who get it.</p><p>IGNYTE is for women who train with purpose, enjoy the challenge and express themselves in their own way.</p><strong>Bring your fire.<br />We’ll build for the burn.</strong></div>
      <img src="/images/about/Ignyte-About-Mission.jpg" alt="Jade boxing in the Ignyte campaign" />
    </section>
    <section className="about-mindset"><div className="section-wrap"><span className="eyebrow">BRING THE FIRE ↘</span><h2>Your energy. Your attitude.<br />Your way to train.</h2><p>Bring the Fire is the spirit behind IGNYTE.</p><p>It’s the focus you bring to a heavy lift, the energy you find in a boxing session and the confidence to try something new.</p><p>It’s also enjoying the process. Training with friends. Celebrating progress. Wearing what feels like you.</p><p>Whether you’re an athlete, a gym regular or finding your rhythm, you belong here.</p><strong>There’s no single way to bring the fire.<br />Bring yours.</strong></div></section>
    <section className="about-commitment section-wrap"><img src="/images/about/Ignyte-About-Built-for-the-Burn-.jpg" alt="Ignyte athlete wearing the collection" /><div><span className="eyebrow">OUR COMMITMENT ↘</span><h2>Built for the burn.</h2><p>Built for the Burn is our product promise: performance-led activewear that brings function, style and expression together.</p><p>Our approach starts with training, with attention to how each piece fits, feels and moves. Expressive silhouettes and considered details bring individuality into the mix.</p><p>For women who care about their training and how they show up.</p><Link className="button button-orange" href="/collections">EXPLORE THE COLLECTION ↗</Link></div></section>
  </div>;
}
