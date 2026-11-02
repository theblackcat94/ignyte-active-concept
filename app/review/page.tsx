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
  return <main className="review-page section-wrap"><span className="eyebrow">CUSTOMER REVIEWS_</span><h1>YOU BROUGHT THE FIRE.<br />NOW TELL US HOW IT WENT<span>_</span></h1><p className="review-intro">Your feedback helps us improve and helps other women find their perfect fit. Tell us what you loved, how it felt and how it performed.</p><ReviewForm products={choices} initialProduct={product ?? ""} /></main>;
}
