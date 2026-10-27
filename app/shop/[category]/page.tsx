import ShopView from "@/components/shop-view";
import { Suspense } from "react";

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  return <Suspense fallback={null}><ShopView category={category} /></Suspense>;
}
