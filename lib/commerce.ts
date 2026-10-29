import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/catalog";
import { pdpFor, type PdpContent } from "@/data/pdp-planner";
import { displayColour } from "./display-colour";
import { sockSizing } from "@/data/size-guide";
import { mappedProductAttributes } from "@/data/product-attributes";

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  color: string;
  description: string;
  status: "draft" | "active" | "archived";
  label: string | null;
  image_path: string;
  gallery: { image: string; alt: string }[];
  pdp_content?: Partial<PdpContent>;
  product_variants: StoreVariant[];
};

export type StoreVariant = {
  id: string;
  product_id: string;
  sku: string;
  size: string;
  price_cents: number;
  sale_price_cents: number | null;
  stock_on_hand: number;
  stock_revision: number;
  active: boolean;
};

export type StoreCategory = { slug: string; name: string; cover_path: string; sort_order: number; active: boolean };

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
    .map(variant => ({ id: variant.id, size: product.name.toLowerCase().includes("sock") && variant.size.toLowerCase() === "one size" ? sockSizing.variant : variant.size,
      price: (variant.sale_price_cents ?? variant.price_cents) / 100,
      originalPrice: variant.sale_price_cents == null ? undefined : variant.price_cents / 100,
      stock: variant.stock_on_hand }));
  const cheapest = variants.length ? [...variants].sort((a, b) => a.price - b.price)[0] : undefined;
  return {
    slug: product.slug, name: product.name, category: product.category,
    ...mappedProductAttributes(product.product_variants.map(variant => variant.sku)),
    color: displayColour(product.color), description: displayColour(product.description),
    image: product.image_path, gallery: (product.gallery ?? []).map(item => ({ ...item, alt: displayColour(item.alt) })), label: product.label ?? undefined,
    pdp: pdpFor(product.name, product.pdp_content, product.slug),
    price: cheapest?.price ?? 0, originalPrice: cheapest?.originalPrice,
    variants,
  };
}

export async function activeCategories(): Promise<StoreCategory[]> {
  const db = publicDb();
  if (!db) return [];
  const { data, error } = await db.from("categories").select("slug,name,cover_path,sort_order,active")
    .eq("active", true).order("sort_order").order("name");
  if (error) throw error;
  return data as StoreCategory[];
}

export async function activeProducts(): Promise<Product[]> {
  const db = publicDb();
  if (!db) return [];
  const { data, error } = await db.from("products").select("*,product_variants(*)")
    .eq("status", "active").order("created_at", { ascending: false });
  if (error) throw error;
  return (data as StoreProduct[]).map(toDisplayProduct).filter(product => (product.variants?.length ?? 0) > 0);
}
