import { publicDb } from "@/lib/commerce";

export type CuratedCollection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_path: string | null;
  cover_alt: string;
  focal_x: number;
  focal_y: number;
  seo_title: string;
  seo_description: string;
  status: "draft" | "published" | "archived";
  publish_at: string | null;
  mode: "manual" | "automatic";
  rules: { category?: string };
  product_slugs: string[];
  max_products?: number;
};

export async function publicCollections(): Promise<CuratedCollection[]> {
  const db = publicDb();
  if (!db) return [];
  const { data: collections, error } = await db.from("collections").select("*").order("created_at");
  if (error) throw error;
  const ids = (collections ?? []).map(item => item.id as string);
  const { data: items, error: itemsError } = ids.length
    ? await db.from("collection_products").select("collection_id,sort_order,products(slug)").in("collection_id", ids).order("sort_order")
    : { data: [], error: null };
  if (itemsError) throw itemsError;
  return (collections ?? []).map(collection => ({
    ...collection,
    product_slugs: (items ?? []).filter(item => item.collection_id === collection.id)
      .map(item => { const product = item.products as unknown as { slug: string } | null; return product?.slug; })
      .filter((slug): slug is string => Boolean(slug)),
  })) as CuratedCollection[];
}

export async function publicPlacement(placement: string): Promise<CuratedCollection | null> {
  const db = publicDb();
  if (!db) return null;
  const { data, error } = await db.from("collection_placements").select("collection_id,max_products").eq("placement", placement).maybeSingle();
  if (error || !data) return null;
  const collections = await publicCollections();
  const collection = collections.find(item => item.id === data.collection_id);
  return collection ? { ...collection, max_products: data.max_products, product_slugs: collection.product_slugs.slice(0, data.max_products) } : null;
}
