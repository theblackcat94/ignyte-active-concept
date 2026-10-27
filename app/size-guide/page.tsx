import type { Metadata } from "next";
import Link from "next/link";
import SizeGuideContent from "@/components/size-guide-content";

export const metadata: Metadata = { title: "Size guide | Ignyte Active", description: "Body reference measurements and measuring instructions for Ignyte Active." };

export default function SizeGuidePage() {
  return <main className="size-guide-page section-wrap"><div className="breadcrumb"><Link href="/">HOME</Link><span>/</span><span>SIZE GUIDE</span></div><span className="eyebrow">IGNYTE / FIND YOUR FIT</span><h1>SIZE GUIDE<span>.</span></h1><p className="size-guide-intro">Compare your bust, waist and hip measurements with our S, M and L reference chart.</p><SizeGuideContent /></main>;
}
