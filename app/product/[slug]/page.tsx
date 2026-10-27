import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { legacyProductSlugs, products } from "@/lib/catalog";
import { activeProducts, commerceConfigured } from "@/lib/commerce";
import ProductDetail from "@/components/product-detail-v2";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ignyte.theblackcat94.com";
const findProduct = cache(async (slug: string) => {
  const active = commerceConfigured ? await activeProducts() : [];
  const catalog = active.length ? active : products;
  const product = catalog.find(p => p.slug === (legacyProductSlugs[slug] || slug));
  return { product, live: active.length > 0 };
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { product, live } = await findProduct(slug);
  if (!product) return { title: "Product not found | Ignyte Active", robots: { index: false } };
  const title = `${product.name} in ${product.color} | Ignyte Active`;
  const text = product.description.replace(/\s+/g, " ").trim();
  const description = text.length > 155 ? `${text.slice(0, 152).replace(/\s+\S*$/, "")}…` : text;
  const url = new URL(`/product/${product.slug}/`, siteUrl).toString();
  const image = new URL(product.image, siteUrl).toString();
  return {
    title, description, alternates: { canonical: url },
    robots: { index: live, follow: live },
    openGraph: { type: "website", title, description, url, siteName: "Ignyte Active",
      images: [{ url: image, width: 1800, height: 2400, alt: `${product.name} in ${product.color}` }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { product, live } = await findProduct(slug);
  if (!product) notFound();
  const url = new URL(`/product/${product.slug}/`, siteUrl).toString();
  const schema = {
    "@context": "https://schema.org", "@type": "Product", name: product.name,
    description: product.description, color: product.color, brand: { "@type": "Brand", name: "Ignyte Active" },
    image: [product.image, ...product.gallery.map(item => item.image)].map(path => new URL(path, siteUrl).toString()),
    url,
    ...(live ? { offers: (product.variants ?? []).map(variant => ({
      "@type": "Offer", url, priceCurrency: "AUD", price: variant.price.toFixed(2),
      availability: variant.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemOffered: { "@type": "Product", name: `${product.name} / ${variant.size}` },
    })) } : {}),
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} /><ProductDetail product={product} /></>;
}
