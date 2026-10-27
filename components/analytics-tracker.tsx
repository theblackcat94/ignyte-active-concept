"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function AnalyticsTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || navigator.doNotTrack === "1") return;
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
