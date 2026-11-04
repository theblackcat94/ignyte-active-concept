import type { MetadataRoute } from "next";
import { categories } from "@/lib/catalog";
import { activeProducts, commerceConfigured } from "@/lib/commerce";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ignyte.theblackcat94.com";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (siteUrl.startsWith("https://dev.")) return [];

  const pages = [
    "",
    "/shop/",
    "/collections/",
    "/about/",
    "/contact/",
    "/returns/",
    "/size-guide/",
    "/support/",
    "/privacy/",
    "/terms/",
    ...categories.filter(category => category.id !== "all").map(category => `/shop/${category.id}/`),
  ];

  let productUrls: string[] = [];
  if (commerceConfigured) {
    try {
      const products = await activeProducts();
      productUrls = products.map(product => `/product/${product.slug}/`);
    } catch {
      // Keep the public information pages available in the sitemap if the catalogue is temporarily unavailable.
    }
  }

  return [...pages, ...productUrls].map(path => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : path.startsWith("/product/") ? 0.7 : 0.8,
  }));
}
