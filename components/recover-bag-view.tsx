"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
type Item = { slug: string; size: string; quantity: number };
export default function RecoverBagView() {
  const router = useRouter();
  const [message, setMessage] = useState("Checking your saved bag…");
  const [items, setItems] = useState<Item[] | null>(null);
  const [unavailable, setUnavailable] = useState(0);
  const [restoreToken, setRestoreToken] = useState<string | null>(null);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    window.history.replaceState({}, "", "/recover-bag/");
    if (!token) { queueMicrotask(() => setMessage("This bag link is invalid.")); return; }
    void fetch(`/api/recovery/restore/?token=${encodeURIComponent(token)}`, { cache: "no-store", referrerPolicy: "no-referrer" })
      .then(async response => { const body = await response.json(); if (!response.ok) throw Error(body.error); return body as { items: Item[]; unavailable: number }; })
      .then(result => { setItems(result.items); setUnavailable(result.unavailable); setRestoreToken(token); setMessage(result.items.length ? "Your saved pieces are ready." : "These pieces are no longer available."); })
      .catch(error => setMessage(error instanceof Error ? error.message : "The bag could not be restored."));
  }, []);
  function restore() {
    if (!items?.length) return;
    try {
      const existing = JSON.parse(localStorage.getItem("ignyte-concept-bag") || "[]") as Item[];
      const merged = [...existing];
      for (const item of items) if (!merged.some(current => current.slug === item.slug && current.size === item.size)) merged.push(item);
      window.dispatchEvent(new CustomEvent("ignyte:restore-bag", { detail: merged.filter(item => !existing.some(current => current.slug === item.slug && current.size === item.size)) }));
      if (restoreToken) void fetch("/api/recovery/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: restoreToken }), keepalive: true });
      router.push("/shop/?bag=restored");
    } catch { setMessage("Your browser could not save the bag. Please shop the collection instead."); }
  }
  return <main className="section-wrap" style={{ minHeight: "55vh", paddingBlock: "clamp(50px,8vw,120px)" }}><span className="eyebrow">YOUR IGNYTE BAG_</span><h1 style={{ fontSize: "clamp(42px,7vw,86px)", lineHeight: 1 }}>PICK UP WHERE YOU LEFT OFF.</h1><p role="status">{message}</p>{unavailable > 0 && <p>{unavailable} item{unavailable === 1 ? "" : "s"} can no longer be added. Availability and prices will be checked again at checkout.</p>}{items?.length ? <button type="button" className="button button-orange" onClick={restore}>RESTORE MY BAG ↗</button> : <Link href="/shop/" className="button button-orange">SHOP IGNYTE ↗</Link>}</main>;
}
