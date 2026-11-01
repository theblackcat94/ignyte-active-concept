import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import RegistrationMarks from "@/components/registration-marks";
import BrandFilm from "@/components/brand-film";
import "./about-alternative.css";

export const metadata: Metadata = {
  title: "About IGNYTE Active | Editorial Preview",
  description: "Explore the story behind IGNYTE Active in a new editorial About page preview.",
  robots: { index: false, follow: false },
};

const values = [
  ["01", "No distractions", "Designed to stay put, feel secure, and let you focus on the work."],
  ["02", "Moves with you", "Flexible support that responds to every rep, hold, stretch, and session."],
  ["03", "Tested in real training", "Built for sweat, pressure, and repeat wear."],
];

export default function AboutAlternativePage() {
  return <main className="about-alt-page">
    <section className="about-alt-hero" aria-labelledby="about-alt-title">
      <div className="about-alt-hero-copy">
        <span className="eyebrow">IGNYTE® ACTIVEWEAR ↘</span>
        <h1 id="about-alt-title">High-performance gear for women who <span className="fx-ember">bring the fire</span>.</h1>
        <p>IGNYTE brings together training, style and individuality. For women who love a challenge and bring their own energy to every session.</p>
      </div>
      <div className="about-alt-hero-image about-alt-image-frame">
        <Image src="/images/about/About-hero-2.webp" alt="IGNYTE athlete training with battle ropes" fill priority sizes="(max-width: 800px) 100vw, 46vw" />
        <RegistrationMarks />
      </div>
    </section>

    <section className="about-alt-values about-alt-wrap" aria-label="What makes IGNYTE different">
      <div className="about-alt-values-intro"><span className="eyebrow">MADE TO MOVE ↘</span><p>Performance you can feel. Expression you can make your own.</p></div>
      <div className="about-alt-values-list">{values.map(([number, title, copy]) => <div className="about-alt-value" key={number}><span>{number}</span><div><h2>{title}</h2><p>{copy}</p></div><span aria-hidden="true">↙</span></div>)}</div>
    </section>

    <section className="about-alt-mission about-alt-wrap" aria-labelledby="about-alt-mission-title">
      <div className="about-alt-mission-copy"><span className="eyebrow">OUR MISSION ↘</span><h2 id="about-alt-mission-title">To inspire women to <em>bring the fire.</em></h2><p>The determination to try something harder. The satisfaction of a strong session, shared with people who get it.</p><strong>Bring your fire.<br />We’ll build for the burn.</strong></div>
      <div className="about-alt-mission-photos" aria-label="IGNYTE training photography">
        <div className="about-alt-photo about-alt-photo-main"><Image src="/images/about/About-bring-the-fire-3-alt.webp" alt="IGNYTE athlete training on a bike in mauve activewear" fill sizes="(max-width: 800px) 70vw, 32vw" /></div>
        <div className="about-alt-photo about-alt-photo-overlap"><Image src="/images/about/About-bring-the-fire-4.webp" alt="Two IGNYTE athletes in training wear" fill sizes="(max-width: 800px) 42vw, 19vw" /></div>
      </div>
    </section>

    <section className="about-alt-mindset" aria-labelledby="about-alt-mindset-title">
      <div className="about-alt-mindset-grid about-alt-wrap">
        <div className="about-alt-mindset-visual about-alt-image-frame"><Image src="/images/about/About-bring-the-fire-2.webp" alt="Two IGNYTE athletes training on bikes" fill sizes="(max-width: 800px) 100vw, 44vw" /><RegistrationMarks /></div>
        <div className="about-alt-mindset-copy"><span className="eyebrow">BRING THE FIRE ↘</span><h2 id="about-alt-mindset-title">Your energy. Your attitude. Your way to train.</h2><p>Bring the Fire is the spirit behind IGNYTE.</p><p>It’s the focus you bring to a heavy lift, the energy you find in a boxing session and the confidence to try something new.</p><p>It’s also enjoying the process. Training with friends. Celebrating progress. Wearing what feels like you.</p><p>Whether you’re an athlete, a gym regular or finding your rhythm, you belong here.</p><strong>There’s no single way to bring the fire.<br />Bring yours.</strong></div>
      </div>
    </section>

    <section className="about-alt-commitment about-alt-wrap" aria-labelledby="about-alt-commitment-title">
      <div className="about-alt-commitment-copy"><span className="eyebrow">OUR COMMITMENT ↘</span><h2 id="about-alt-commitment-title">Built for the burn.</h2><p>Built for the Burn is our product promise: performance-led activewear that brings function, style and expression together.</p><p>Our approach starts with training, with attention to how each piece fits, feels and moves. Expressive silhouettes and considered details bring individuality into the mix.</p><p>For women who care about their training and how they show up.</p><Link className="button button-orange" href="/collections">EXPLORE THE COLLECTION ↗</Link></div>
      <div className="about-alt-commitment-media"><BrandFilm label="IGNYTE brand film" /><div className="about-alt-commitment-photo"><Image src="/images/about/Ignyte-About-Built-for-the-Burn-.jpg" alt="IGNYTE athletes training together" fill sizes="(max-width: 800px) 40vw, 21vw" /></div></div>
    </section>

    <section className="about-alt-founders" aria-labelledby="about-alt-founders-title">
      <div className="about-alt-founders-image about-alt-image-frame"><Image src="/images/about/marcus-jade.jpg" alt="Jade and Marcus training together" fill sizes="100vw" /><RegistrationMarks /></div>
      <div className="about-alt-founders-copy about-alt-wrap"><div><span className="eyebrow">OUR STORY ↘</span><h2 id="about-alt-founders-title">What fuels IGNYTE</h2></div><div><p>Founded in 2026, IGNYTE Active brings performance and self-expression together. We create high-performance activewear for women who move with purpose and express themselves with confidence.</p><p>We believe your activewear should do more than look good. It should support you through demanding sessions, move with you as the intensity builds and feel like your own.</p><p>For us, training is personal. It’s the commitment to keep showing up, the strength you discover on the hard days and the confidence you build along the way. There’s no single way to be strong, and no one else’s story you need to follow.</p><p>Take your training seriously. Make it your own.</p><strong>Bring your own fire.</strong><p className="about-alt-signature">Jade &amp; Marcus<br /><span>Founders, IGNYTE Active</span></p></div></div>
    </section>
  </main>;
}
