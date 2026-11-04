"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { GOOGLE_ANALYTICS_ID } from "@/lib/google-analytics";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || navigator.doNotTrack === "1") return;
    if (!/^\/(admin|account|checkout|guest|review|unsubscribe)(\/|$)/.test(pathname)) {
      window.gtag?.("event", "page_view", {
        send_to: GOOGLE_ANALYTICS_ID,
        page_location: `${window.location.origin}${pathname}`,
        page_path: pathname,
      });
    }
    if (!/^\/$|^\/(shop(?:\/[a-z0-9-]+)?|product\/[a-z0-9-]+|support|contact|privacy|terms|wishlist)\/?$/.test(pathname)) return;
    const eventName = pathname.startsWith("/product/") ? "product_view" : "page_view";
    void fetch("/api/analytics", {
      method: "POST", credentials: "omit", keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, path: pathname }),
    }).catch(() => {});
  }, [pathname]);
  return null;
}
