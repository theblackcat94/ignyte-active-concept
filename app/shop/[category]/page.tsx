import ShopView from "@/components/shop-view";
import { Suspense } from "react";
import type { Metadata } from "next";
import { permanentRedirect, redirect } from "next/navigation";
import { adminDb, publicDb } from "@/lib/commerce";

export const dynamic = "force-dynamic";

const seo: Record<string, { title: string; description: string }> = {
  leggings: { title: "Women’s Performance Leggings | Ignyte Active", description: "Shop women’s performance leggings for training, movement and everyday wear. Explore seamless, high-waisted styles in Espresso and Aurora at Ignyte Active." },
  "sports-bras": { title: "Women’s Sports Bras for Training | Ignyte Active", description: "Find your next training sports bra at Ignyte Active. Explore cross-back, multi-strap and seamless styles for purposeful movement and confident self-expression." },
  tops: { title: "Women’s Activewear & Training Tops | Ignyte Active", description: "Explore women’s activewear tops at Ignyte Active. Discover fitted halter styles made for movement, with Espresso and Aurora colours to make your own." },
  shorts: { title: "Women’s Workout & Training Shorts | Ignyte Active", description: "Shop women’s workout shorts at Ignyte Active. Explore relaxed training shorts, crossover bike shorts and seamless styles for your next move and everyday wear." },
  accessories: { title: "Activewear Accessories & Socks | Ignyte Active", description: "Complete your training outfit with Ignyte Active accessories. Shop white crew socks with ribbed cuffs and signature branding for the gym and everyday wear." },
};

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  if (seo[category]) return seo[category];
  const db = publicDb();
  const { data } = db ? await db.from("categories").select("name").eq("slug", category).maybeSingle() : { data: null };
  return data ? { title: `Shop ${data.name} | IGNYTE Active`, description: `Explore ${data.name} at IGNYTE Active.`, alternates: { canonical: `/shop/${category}/` } }
    : { title: "Shop Ignyte Active", robots: { index: false } };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const db = publicDb();
  if (db) {
    const { data } = await db.from("categories").select("slug").eq("slug", category).eq("active", true).maybeSingle();
    if (!data) {
      const { data: old } = await adminDb().from("category_redirects").select("destination").eq("old_slug", category).maybeSingle();
      if (old?.destination) permanentRedirect(old.destination);
      redirect("/shop/");
    }
  }
  return <Suspense fallback={null}><ShopView category={category} /></Suspense>;
}
