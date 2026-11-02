"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { publicDb } from "@/lib/commerce";

type Choice = { slug: string; name: string; color: string; image: string };
export default function ReviewForm({ products, initialProduct }: { products: Choice[]; initialProduct: string }) {
  const [product, setProduct] = useState(products.some(item => item.slug === initialProduct) ? initialProduct : "");
  const [rating, setRating] = useState(0);
  const [fit, setFit] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const choice = products.find(item => item.slug === product);
  useEffect(() => {
    if (!product) return;
    let active = true;
    fetch(`/api/reviews?product=${encodeURIComponent(product)}`).then(response => { if (active) setReady(response.ok); }).catch(() => { if (active) setReady(false); });
    return () => { active = false; };
  }, [product]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rating || !fit || !product) { setError("Choose a product, rating and fit before sending."); return; }
    setSending(true); setError("");
    try {
      const form = new FormData(event.currentTarget);
      form.set("rating", String(rating)); form.set("fit", fit); form.set("product", product);
      const session = await publicDb()?.auth.getSession();
      const token = session?.data.session?.access_token;
      const response = await fetch("/api/reviews", { method: "POST", body: form, headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your review.");
      setSuccess(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your review."); }
    finally { setSending(false); }
  }
  if (success) return <section className="review-thanks" role="status"><div className="review-embers" aria-hidden="true"><i/><i/><i/><i/><i/><i/></div><span className="eyebrow">REVIEW RECEIVED_</span><h2>YOU BROUGHT THE FIRE! <span aria-hidden="true">🔥</span></h2><p>Thank you for sharing your experience. Your review is awaiting approval. Your feedback helps us grow, improve and keep the IGNYTE community moving.</p><Link href="/shop" className="button button-orange">KEEP EXPLORING ↗</Link></section>;
  return <form className="review-form" onSubmit={submit}>
    <label>PRODUCT BEING REVIEWED<select name="product-choice" value={product} onChange={event => { setReady(false); setProduct(event.target.value); }} required><option value="">Select your IGNYTE product</option>{products.map(item => <option key={item.slug} value={item.slug}>{item.name} · {item.color}</option>)}</select></label>
    {choice && <div className="review-product"><img src={choice.image} alt={`${choice.name} in ${choice.color}`} /><span><strong>{choice.name}</strong><small>{choice.color}</small></span></div>}
    <fieldset><legend>OVERALL RATING</legend><div className="review-stars" role="group" aria-label="Overall rating from one to five stars">{[1,2,3,4,5].map(value => <button key={value} type="button" aria-label={`${value} ${value === 1 ? "star" : "stars"}`} aria-pressed={rating === value} onClick={() => setRating(value)}>{value <= rating ? "★" : "☆"}</button>)}</div></fieldset>
    <fieldset><legend>HOW DID IT FIT?</legend><div className="review-fit-options">{([["runs_smaller","Runs Smaller"],["true_to_size","True to Size"],["runs_larger","Runs Larger"]] as const).map(([value,label]) => <label key={value}><input type="radio" name="fit-choice" value={value} checked={fit === value} onChange={() => setFit(value)} required />{label}</label>)}</div></fieldset>
    <label>YOUR REVIEW<textarea name="body" minLength={20} maxLength={3000} rows={6} placeholder="Tell us about the fit, comfort and performance…" required /></label>
    <div className="review-contact"><label>YOUR NAME<input name="name" minLength={2} maxLength={80} autoComplete="name" required /></label><label>EMAIL ADDRESS<input name="email" type="email" autoComplete="email" required /></label></div>
    <p className="review-privacy">Your email is used privately to verify your review and is never shown publicly.</p>
    <label>ADD A PHOTO <span>(OPTIONAL, UP TO 5 MB)</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp" /></label>
    <input className="review-honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    {!ready && product && <p className="review-unavailable" role="status">Review submissions are being prepared. This form is a preview until the review database is ready.</p>}
    {error && <p className="review-error" role="alert">{error}</p>}
    <button className="button button-orange" type="submit" disabled={sending || !ready}>{sending ? "SENDING REVIEW…" : "SHARE YOUR REVIEW ↗"}</button>
  </form>;
}
