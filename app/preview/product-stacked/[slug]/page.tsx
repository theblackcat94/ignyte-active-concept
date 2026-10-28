import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { legacyProductSlugs, products } from "@/lib/catalog";
import { activeProducts, commerceConfigured } from "@/lib/commerce";
import ProductDetail from "@/components/product-detail-v2";
import "@/app/pdp-stack-preview.css";

export const metadata: Metadata = { title: "Stacked product layout preview | Ignyte Active", robots: { index: false, follow: false } };

export default async function StackedProductPreview({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const active = commerceConfigured ? await activeProducts() : [];
  const catalog = active.length ? active : products;
  const product = catalog.find(item => item.slug === (legacyProductSlugs[slug] || slug));
  if (!product) notFound();

  return <>
    <div className="pdp-layout-preview-banner section-wrap"><span>ALTERNATIVE PDP LAYOUT / FOR REVIEW</span><Link href={`/product/${product.slug}/`}>VIEW CURRENT PRODUCT PAGE ↗</Link></div>
    <ProductDetail key={product.slug} product={product} galleryLayout="stacked" />
  </>;
}
