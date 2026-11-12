import ShopView from "@/components/shop-view";
import { Suspense } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Women’s Activewear | Ignyte Active",
  description: "Shop the Ignyte Active collection: performance sports bras, leggings, shorts, tops and training accessories made for movement.",
  alternates: { canonical: "/shop/" },
};

export default function ShopPage() { return <Suspense fallback={null}><ShopView category="all" /></Suspense>; }
