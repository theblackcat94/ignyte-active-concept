import type { Metadata } from "next";
import { activeProducts, commerceConfigured } from "@/lib/commerce";
import { products as fallbackProducts } from "@/lib/catalog";
import ReviewForm from "@/components/review-form";
import "./review.css";

export const metadata: Metadata = { title: "Review Your IGNYTE Gear | IGNYTE Active", robots: { index: false, follow: false } };

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  const catalog = commerceConfigured ? await activeProducts() : fallbackProducts;
  const choices = catalog.map(item => ({ slug: item.slug, name: item.name, color: item.color, image: item.image }));
  return <main className="review-page section-wrap"><span className="eyebrow">CUSTOMER REVIEWS_</span><h1>HOW DID IT GO?<span>_</span></h1><p className="review-intro">Put your IGNYTE gear to the test? Tell us how it fits, feels and performs. Your feedback helps us improve and helps others find their fit.</p><ReviewForm products={choices} initialProduct={product ?? ""} /></main>;
}
