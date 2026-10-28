"use client";

import { useEffect, useRef, useState } from "react";
import { socialCoverImages, suppliedSocialCovers, type PdpSocialPost } from "@/data/pdp-social";
import { asset } from "@/lib/asset";
import "@/app/pdp-social.css";

export default function PdpSocialStrip({ productSlug }: { productSlug?: string }) {
  const [posts, setPosts] = useState<PdpSocialPost[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => { void fetch("/api/pdp-social", { cache: "no-store" })
      .then(async response => { if (!response.ok) throw Error("Could not load posts"); return response.json() as Promise<{ posts: PdpSocialPost[] }>; })
      .then(data => { if (active) setPosts(data.posts.filter(post => !productSlug || !post.productSlugs.length || post.productSlugs.includes(productSlug)).slice(0, 10)); })
      .catch(() => { if (active) setPosts([]); }); };
    refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", onVisible); };
  }, [productSlug]);

  if (!posts.length) return null;
  function move(direction: number) { trackRef.current?.scrollBy({ left: direction * (trackRef.current.clientWidth * 0.8), behavior: "smooth" }); }

  return <section className="pdp-social" aria-label="Ignyte on Instagram">
    <div className="pdp-social-heading"><div><span className="eyebrow">FOLLOW THE FIRE</span><h2>IGNYTE <em>IN MOTION.</em></h2></div><div className="pdp-social-controls"><a href="https://www.instagram.com/ignyteactive/" target="_blank" rel="noopener noreferrer">FOLLOW @IGNYTEACTIVE ↗</a>{posts.length > 1 && <><button type="button" aria-label="Previous Instagram posts" onClick={() => move(-1)}>←</button><button type="button" aria-label="Next Instagram posts" onClick={() => move(1)}>→</button></>}</div></div>
    <div className="pdp-social-track" ref={trackRef}>{posts.map((post, index) => {
      const cover = post.image || suppliedSocialCovers[post.href.match(/\/(?:p|reel)\/([^/]+)/)?.[1] || ""] || socialCoverImages[index % socialCoverImages.length];
      const imageSrc = cover.startsWith("/images/") ? asset(cover) : cover;
      const isReel = /\/reel\//.test(post.href);
      return <article className={`pdp-social-card ${post.href.includes("DdvnCY3ii41") ? "is-landscape" : ""}`} key={post.id}>
        {post.video ? <div className="pdp-social-media"><video src={post.video} poster={imageSrc} controls playsInline preload="none" aria-label={post.alt} /></div> : <a className="pdp-social-media" href={post.href} target="_blank" rel="noopener noreferrer" aria-label={`${post.alt} — open on Instagram`}><img src={imageSrc} alt={post.image ? post.alt : "Ignyte campaign image"} loading="lazy" /><span className="pdp-social-media-shade" aria-hidden="true" /><span className="pdp-social-media-mark" aria-hidden="true">{isReel ? "▶" : "↗"}</span></a>}
        <div className="pdp-social-card-foot"><span><small>{isReel ? "REEL" : "POST"}</small></span><a href={post.href} target="_blank" rel="noopener noreferrer">{post.caption || (isReel ? "WATCH REEL" : "VIEW POST")} ↗</a></div>
      </article>;
    })}</div>
  </section>;
}
