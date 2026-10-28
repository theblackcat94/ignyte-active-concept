"use client";

import { useEffect, useRef, useState } from "react";
import type { PdpSocialPost } from "@/data/pdp-social";
import { asset } from "@/lib/asset";
import "@/app/pdp-social.css";

export default function PdpSocialStrip({ productSlug }: { productSlug: string }) {
  const [posts, setPosts] = useState<PdpSocialPost[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/pdp-social", { cache: "no-store" })
      .then(async response => { if (!response.ok) throw Error("Could not load posts"); return response.json() as Promise<{ posts: PdpSocialPost[] }>; })
      .then(data => { if (active) setPosts(data.posts.filter(post => !post.productSlugs.length || post.productSlugs.includes(productSlug))); })
      .catch(() => { if (active) setPosts([]); });
    return () => { active = false; };
  }, [productSlug]);

  if (!posts.length) return null;
  function move(direction: number) { trackRef.current?.scrollBy({ left: direction * (trackRef.current.clientWidth * 0.8), behavior: "smooth" }); }

  return <section className="pdp-social" aria-label="Ignyte on Instagram">
    <div className="pdp-social-heading"><div><span className="eyebrow">FOLLOW THE FIRE</span><h2>IGNYTE <em>IN MOTION.</em></h2></div><div className="pdp-social-controls"><a href="https://www.instagram.com/ignyteactive/" target="_blank" rel="noopener noreferrer">FOLLOW US ↗</a>{posts.length > 1 && <><button type="button" aria-label="Previous Instagram posts" onClick={() => move(-1)}>←</button><button type="button" aria-label="Next Instagram posts" onClick={() => move(1)}>→</button></>}</div></div>
    <div className="pdp-social-track" ref={trackRef}>{posts.map(post => <a className="pdp-social-card" key={post.id} href={post.href} target="_blank" rel="noopener noreferrer" aria-label={`${post.alt} — view on Instagram`}><img src={post.image.startsWith("/images/") ? asset(post.image) : post.image} alt={post.alt} loading="lazy" /><span>{post.caption || "VIEW ON INSTAGRAM"} ↗</span></a>)}</div>
  </section>;
}
