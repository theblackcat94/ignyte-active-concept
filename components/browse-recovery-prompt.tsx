"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserDb, commerceConfigured } from "@/lib/commerce";

/** Optional help prompt. A visit alone never qualifies as meaningful engagement. */
export default function BrowseRecoveryPrompt({ slug, bagHasProduct }: { slug: string; bagHasProduct: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!commerceConfigured || bagHasProduct) return;
    let activeSeconds = 0;
    let interaction: "gallery" | "size" | "colour" | "guide" | "fit" | null = null;
    let cancelled = false;
    let reported = false;
    const sessionKey = "ignyte-fit-help-shown";
    const onInteract = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest(".pdp-stack-media")) interaction = "gallery";
      else if (target.closest(".size-grid")) interaction = "size";
      else if (target.closest(".pdp-colour-options")) interaction = "colour";
      else if (target.closest(".size-heading button,.pdp-guide-dialog")) interaction = "guide";
      else if (target.closest(".pdp-fit-confidence,.detail-accordions")) interaction = "fit";
    };
    document.addEventListener("pointerdown", onInteract, { passive: true });
    const timer = window.setInterval(async () => {
      if (reported || document.hidden || !document.hasFocus()) return;
      activeSeconds++;
      if (activeSeconds < 20 || !interaction) return;
      reported = true;
      const { data } = await browserDb().auth.getSession();
      if (!data.session?.access_token || cancelled) return;
      const response = await fetch("/api/recovery/activity", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ kind: "browse", productSlug: slug, engagement: { activeSeconds, interaction } }) }).catch(() => null);
      if (!response?.ok || cancelled) return;
      const result = await response.json().catch(() => null);
      if (!result?.captured || sessionStorage.getItem(sessionKey)) return;
      const settings = await fetch("/api/recovery/activity", { cache: "no-store" }).then(res => res.json()).catch(() => null);
      if (!settings?.onsiteEnabled || cancelled) return;
      sessionStorage.setItem(sessionKey, "1");
      setShow(true);
    }, 1000);
    return () => { cancelled = true; document.removeEventListener("pointerdown", onInteract); window.clearInterval(timer); };
  }, [slug, bagHasProduct]);
  if (!show || bagHasProduct) return null;
  return <aside className="pdp-fit-help" aria-label="Find your fit"><div><span>FIND YOUR FIT_</span><p>Need help choosing your size?</p><Link href="/size-guide/">VIEW SIZE GUIDE ↗</Link></div><button type="button" onClick={() => setShow(false)} aria-label="Dismiss fit help">×</button></aside>;
}
