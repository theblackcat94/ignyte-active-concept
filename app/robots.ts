import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ignyte.theblackcat94.com";
const isIndexableHost = new URL(siteUrl).hostname === "ignyteactive.com";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableHost) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/account/",
        "/admin/",
        "/api/",
        "/checkout/",
        "/guest/orders/",
        "/home-alternative/",
        "/home-preview/",
        "/instagram-live-preview/",
        "/preview/",
        "/unsubscribe/",
        "/wishlist/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
