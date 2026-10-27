import { notFound } from "next/navigation";
import ShopView from "@/components/shop-view";
import { categories, type Category } from "@/lib/catalog";
import { Suspense } from "react";

export function generateStaticParams() { return categories.filter(c => c.id !== "all").map(c => ({ category: c.id })); }

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!categories.some(c => c.id === category && c.id !== "all")) notFound();
  return <Suspense fallback={null}><ShopView category={category as Category} /></Suspense>;
}
