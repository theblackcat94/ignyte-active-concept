import ShopView from "@/components/shop-view";
import { Suspense } from "react";

export default function ShopPage() { return <Suspense fallback={null}><ShopView category="all" /></Suspense>; }
