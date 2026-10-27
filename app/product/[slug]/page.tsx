import { notFound } from "next/navigation";
import { legacyProductSlugs, products } from "@/lib/catalog";
import { activeProducts, commerceConfigured } from "@/lib/commerce";
import ProductDetail from "@/components/product-detail";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const active = commerceConfigured ? await activeProducts() : [];
  const catalog = active.length ? active : products;
  const product = catalog.find(p => p.slug === (legacyProductSlugs[slug] || slug));
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
