import { notFound } from "next/navigation";
import { legacyProductSlugs, products } from "@/lib/catalog";
import ProductDetail from "@/components/product-detail";

export function generateStaticParams() { return [...products.map(p => ({ slug: p.slug })), ...Object.keys(legacyProductSlugs).map(slug => ({ slug }))]; }

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find(p => p.slug === (legacyProductSlugs[slug] || slug));
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
