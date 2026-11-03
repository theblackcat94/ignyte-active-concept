import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import HeaderLogo from "@/components/header-logo";
import "./case-study.css";

export const metadata: Metadata = {
  title: "IGNYTE Active — Brand Case Study Preview",
  description: "A preview of the strategy, identity and digital experience behind IGNYTE Active.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

const image = (name: string) => `/images/about/${name}`;

export default function IgnyteCaseStudy() {
  return <main className="case-study">
    <section className="case-hero">
      <Image src={image("About-hero-2.webp")} alt="IGNYTE athletes in campaign photography" fill priority sizes="100vw" />
      <div className="case-hero-shade" />
      <div className="case-hero-copy"><span className="case-kicker">IGNYTE ACTIVE / BRAND CASE STUDY_</span><h1>BUILT FOR<br />THE BURN<span>.</span></h1><p>Building a performance activewear brand for women who move with purpose and express themselves without compromise.</p><span className="case-index">IDENTITY / DIGITAL / EXPERIENCE</span></div>
    </section>

    <section className="case-opportunity case-wrap"><p className="case-kicker">01 / THE OPPORTUNITY_</p><div><h2>MORE THAN<br />GEAR.</h2><div className="case-prose"><p>Activewear has to work hard. But the women wearing it should never have to choose between performance and personal expression.</p><p>The challenge for IGNYTE was to build a brand that could hold both truths at once: credible in the gym, distinctive in a crowded category and confident enough to stand for something beyond the product.</p><p>Performance became the foundation. Self-expression became the attitude. A woman doesn’t leave her identity at the gym door. Her activewear should reflect that.</p></div></div></section>

    <section className="case-idea"><div className="case-wrap"><p className="case-kicker">02 / THE CENTRAL IDEA_</p><h2>BUILT FOR<br />THE BURN.</h2><p>Three words connect the product to the person. The burn is the effort, energy and intensity of training. It is also the inner fire that makes every woman her own.</p><span>BRING YOUR OWN FIRE_</span></div></section>

    <section className="case-principles case-wrap"><p className="case-kicker">03 / STRATEGIC FOUNDATION_</p><h2>FUNCTION IS THE PROMISE.<br /><em>EXPRESSION IS THE DIFFERENCE.</em></h2><div className="case-three"><article><span>01 / PERFORMANCE</span><p>Credibility first. Support, fit and function need to feel tangible, giving the product space to demonstrate what it does.</p></article><article><span>02 / CONFIDENCE</span><p>Strength without stereotype. The voice is bold without aggression, empowering without clichés.</p></article><article><span>03 / EXPRESSION</span><p>Colour, copy and movement give the brand permission to be expressive without compromising functional clarity.</p></article></div></section>

    <section className="case-identity"><div className="case-wrap"><div className="case-identity-copy"><p className="case-kicker">04 / VISUAL IDENTITY_</p><h2>AN IDENTITY<br />WITH IGNITION.</h2><p>The visual language translates inner fire into a flexible system. Confident typography provides presence; contrast creates recognition; directional graphics and cropped compositions add movement. Ignition is carried through pace and restraint, rather than flames everywhere.</p></div><div className="case-logo" aria-label="IGNYTE wordmark"><HeaderLogo /><small>APPROVED IGNYTE WORDMARK</small></div></div></section>

    <section className="case-palette case-wrap"><p className="case-kicker">05 / COLOUR SYSTEM_</p><h2>THE HEAT.<br />THE BALANCE.</h2><p>Orange-red ignites the system. Navy grounds it in performance. Cream and warm neutral give photography space to breathe. The impact comes from contrast and intention.</p><div className="case-swatches"><div style={{background:"#1F2A44",color:"#fff"}}>INK NAVY <span>#1F2A44</span></div><div style={{background:"#FF4533"}}>IGNYTE ORANGE <span>#FF4533</span></div><div style={{background:"#EEEAE4"}}>CREAM <span>#EEEAE4</span></div><div style={{background:"#F7F3EA"}}>WARM NEUTRAL <span>#F7F3EA</span></div></div></section>

    <section className="case-type case-wrap"><p className="case-kicker">06 / TYPOGRAPHY & GRAPHIC LANGUAGE_</p><div className="case-type-grid"><div><span>SÖHNE / PRIMARY</span><h2>MOVE<br />WITH FIRE.</h2><p>Confident, direct typography gives campaign statements presence while keeping everyday shopping details clear.</p></div><div><span>SÖHNE MONO / UTILITY</span><strong>01/02 &nbsp; MOVE_↗</strong><p>Monospaced labels bring precision to navigation and specifications. Underscores punctuate sections; arrows signal movement and action; small plus marks frame photography.</p></div></div></section>

    <section className="case-photography"><div className="case-wrap"><p className="case-kicker">07 / ART DIRECTION_</p><h2>SHOW THE GEAR.<br />SHOW THE GRIT.</h2><p>Campaign imagery carries the energy of women in motion. Clean product photography then makes fit, fabric and construction easier to understand.</p><div className="case-photo-grid"><figure><Image src={image("About-bring-the-fire-3-alt.webp")} alt="IGNYTE athlete training" fill sizes="(max-width: 700px) 100vw, 55vw" /><figcaption>Movement expresses the attitude behind the product.</figcaption></figure><figure><Image src="/images/jacob-2026-10/ign-lvr-shts-jac/ign-lvr-shts-jac-seamless-shorts-aurora-hires-main-01.jpg" alt="Seamless Shorts in Aurora product photograph" fill sizes="(max-width: 700px) 100vw, 40vw" /><figcaption>Product photography supports confident fit and colour decisions.</figcaption></figure></div></div></section>

    <section className="case-digital case-wrap"><p className="case-kicker">08 / DIGITAL EXPERIENCE_</p><h2>BUILT TO BE WORN.<br />DESIGNED TO BE USED.</h2><p>The storefront extends the identity into practical decisions: colour selection, fit guidance, product rotation videos and compact delivery reassurance. Large photography brings the collection forward while clear controls help customers shop confidently.</p><div className="case-digital-links"><Link href="/" aria-label="Explore the current IGNYTE homepage">EXPLORE THE LIVE HOMEPAGE ↗</Link><Link href="/product/seamless-short-aurora/">EXPLORE A PRODUCT PAGE ↗</Link></div></section>

    <section className="case-motion"><div className="case-wrap"><div><p className="case-kicker">09 / MOTION & INTERACTION_</p><h2>THE BRAND<br />DOESN’T<br />STAND STILL.</h2><p>Brand film carries the energy of training into the digital experience. Subtle ignition transitions and product rotation videos reinforce the central idea where they add emotion or practical understanding. Reduced-motion settings keep the experience accessible.</p></div><video controls playsInline preload="none" poster="/images/home/video-cover-2.jpg" aria-label="IGNYTE brand film"><source src="/images/home/Ignyte-Vertical-Compressed-Sound.mp4" type="video/mp4" /></video></div></section>

    <section className="case-close case-wrap"><p className="case-kicker">10 / THE RESULT_</p><h2>ONE IDEA.<br />ONE SYSTEM.<br /><em>MANY MOMENTS.</em></h2><p>IGNYTE is designed to behave consistently whether it is worn, watched, explored or purchased. Campaign, identity and ecommerce express the same position: strong performance with room for personality.</p><p>This is a preview of the creative strategy and designed experience. Commercial outcomes and project credits will be added only after verification.</p><Link href="/">EXPLORE IGNYTE ↗</Link></section>
  </main>;
}
