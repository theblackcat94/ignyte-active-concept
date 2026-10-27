import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import SizeGuideContent from "@/components/size-guide-content";
import { asset } from "@/lib/asset";

export const metadata: Metadata = { title: "Size guide | Ignyte Active", description: "Body reference measurements and measuring instructions for Ignyte Active." };

export default function SizeGuidePage() {
  return <main className="size-guide-page section-wrap">
    <div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>SIZE GUIDE</span></div>
    <span className="eyebrow">IGNYTE / FIND YOUR FIT</span>
    <h1>SIZE GUIDE<span>.</span></h1>
    <p className="size-guide-intro">Compare your bust, waist and hip measurements with our S, M and L reference chart.</p>
    <div className="size-guide-layout">
      <SizeGuideContent />
      <aside className="size-guide-editorial" aria-label="Explore Ignyte products">
        <Link href="/product/seamless-legging-lavender/" className="size-guide-product">
          <Image src={asset("/images/jacob-2026-10/ign-lgs-jac/ign-lgs-jac-seamless-leggings-jacaranda-main-01.jpg")} alt="Model wearing Ignyte Seamless Leggings in Jacaranda" width={1800} height={2400} sizes="(min-width: 1200px) 340px, 50vw" />
          <span>SEAMLESS LEGGINGS <span aria-hidden="true">↗</span></span>
        </Link>
        <Link href="/product/motion-sports-bra-black/" className="size-guide-product">
          <Image src={asset("/images/jacob-2026-10/ign-motsbr-blk/ign-motsbr-blk-motion-sports-bra-black-main-01.jpg")} alt="Model wearing Ignyte Motion Sports Bra in black" width={1800} height={2400} sizes="(min-width: 1200px) 340px, 50vw" />
          <span>MOTION SPORTS BRA <span aria-hidden="true">↗</span></span>
        </Link>
      </aside>
    </div>
  </main>;
}
