import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/catalog";

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  category: "sports-bras" | "tops" | "leggings" | "shorts";
  color: string;
  description: string;
  status: "draft" | "active" | "archived";
  label: string | null;
  image_path: string;
  gallery: { image: string; alt: string }[];
  product_variants: StoreVariant[];
};

export type StoreVariant = {
  id: string;
  product_id: string;
  sku: string;
  size: string;
  price_cents: number;
  stock_on_hand: number;
  stock_revision: number;
  active: boolean;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const commerceConfigured = Boolean(url && publishableKey);

let browserClient: SupabaseClient | null = null;

export function publicDb(): SupabaseClient | null {
  if (!url || !publishableKey) return null;
  if (!browserClient) browserClient = createClient(url, publishableKey);
  return browserClient;
}

export function adminDb(): SupabaseClient {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase server configuration is missing");
  return createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function verifiedUser(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const db = publicDb();
  if (!token || !db) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user;
}

export async function verifiedStaff(request: Request) {
  const user = await verifiedUser(request);
  if (!user) return null;
  const { data, error } = await adminDb().from("staff_members").select("role").eq("user_id", user.id).single();
  return error || !data ? null : { user, role: data.role as "admin" | "editor" };
}

export function browserDb() {
  const db = publicDb();
  if (!db) throw new Error("Store accounts have not been configured");
  return db;
}

export function toDisplayProduct(product: StoreProduct): Product {
  const variants = product.product_variants.filter(variant => variant.active)
    .map(variant => ({ id: variant.id, size: variant.size, price: variant.price_cents / 100,
      stock: variant.stock_on_hand }));
  return {
    slug: product.slug, name: product.name, category: product.category,
    color: product.color, description: product.description,
    image: product.image_path, gallery: product.gallery ?? [], label: product.label ?? undefined,
    price: variants.length ? Math.min(...variants.map(variant => variant.price)) : 0,
    variants,
  };
}

export async function activeProducts(): Promise<Product[]> {
  const db = publicDb();
  if (!db) return [];
  const { data, error } = await db.from("products").select("*,product_variants(*)")
    .eq("status", "active").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as StoreProduct[]).map(toDisplayProduct).filter(product => (product.variants?.length ?? 0) > 0);
}
