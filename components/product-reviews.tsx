"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Review = { id: string; rating: number; fit_feedback: string; body: string; display_name: string; verified_purchase: boolean; created_at: string; photo_url?: string | null };
export default function ProductReviews({ productSlug }: { productSlug: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  useEffect(() => { let live = true; fetch(`/api/reviews?product=${encodeURIComponent(productSlug)}`).then(response => response.ok ? response.json() : { reviews: [] }).then(data => { if (live) setReviews(data.reviews ?? []); }).catch(() => {}); return () => { live = false; }; }, [productSlug]);
  return <section className="pdp-customer-reviews" aria-labelledby="pdp-customer-reviews-heading"><span className="eyebrow">CUSTOMER REVIEWS_</span><h2 id="pdp-customer-reviews-heading">YOUR FEEDBACK FUELS US_</h2>{reviews.length ? <><p>{reviews.length} approved {reviews.length === 1 ? "review" : "reviews"} for this product.</p><div className="pdp-review-list">{reviews.map(review => <article key={review.id}><strong aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}{"☆".repeat(5-review.rating)}</strong><p>{review.body}</p><span>{review.display_name} · {review.verified_purchase ? "Verified purchase" : "Customer review"} · {review.fit_feedback.replaceAll("_", " ")}</span>{review.photo_url && <img src={review.photo_url} alt={`Photo shared by ${review.display_name}`} loading="lazy" />}</article>)}</div></> : <p>We&apos;re just getting started. Tried IGNYTE? Share your experience and help others find their fit.</p>}<Link className="button button-outline pdp-review-cta" href={`/review/?product=${encodeURIComponent(productSlug)}`}>{reviews.length ? "WRITE A REVIEW ↗" : "BE FIRST TO REVIEW ↗"}</Link></section>;
}
