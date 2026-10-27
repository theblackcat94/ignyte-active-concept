import { asset } from "./asset";
import prepared from "@/data/jacob-catalog-2026-10-27.json";

export type Category = string;
export type Product = {
  slug: string;
  name: string;
  category: string;
  price: number;
  color: string;
  image: string;
  gallery: { image: string; alt: string }[];
  label?: string;
  description: string;
  originalPrice?: number;
  variants?: { id: string; size: string; price: number; originalPrice?: number; stock: number }[];
};

const coverImage = (name: string) => asset(`/images/collection-covers/${name}`);

// Local preview mirrors the approved media set. Live prices and stock come from Supabase.
const featuredSlugs = ["aura-halter-lavender", "seamless-legging-lavender", "seamless-short-espresso", "seamless-sports-bra-espresso"];
export const products: Product[] = prepared.products.map(item => ({
  slug: item.slug, name: item.name, category: item.category, color: item.color,
  description: item.description, image: asset(item.image_path),
  gallery: item.gallery.map(entry => ({ image: asset(entry.image), alt: entry.alt })),
  price: Math.min(...item.variants.map(variant => variant.price_cents)) / 100,
  variants: item.variants.map(variant => ({ id: variant.sku, size: variant.size,
    price: variant.price_cents / 100, stock: 0 })),
})).sort((a, b) => {
  const aIndex = featuredSlugs.indexOf(a.slug);
  const bIndex = featuredSlugs.indexOf(b.slug);
  return (aIndex < 0 ? 100 : aIndex) - (bIndex < 0 ? 100 : bIndex) || a.name.localeCompare(b.name);
});

export const legacyProductSlugs: Record<string, string> = {
  "seamless-legging-black": "seamless-legging-lavender",
  "seamless-short-black": "seamless-short-espresso",
  "aura-halter-black": "aura-halter-lavender",
};

export const categories: { id: Category; label: string; cover: string }[] = [
  { id: "all", label: "Shop all", cover: coverImage("Ignyte-Shop-All.jpg") },
  { id: "sports-bras", label: "Sports bras", cover: coverImage("Ignyte-Sports-Bras.jpg") },
  { id: "tops", label: "Tops", cover: coverImage("Ignyte-Tops.jpg") },
  { id: "leggings", label: "Leggings", cover: coverImage("Ignyte-Leggings.jpg") },
  { id: "shorts", label: "Shorts", cover: coverImage("Ignyte-Shorts.jpg") },
  { id: "accessories", label: "Accessories", cover: asset(prepared.products.find(item => item.category === "accessories")!.image_path) }
];

export const money = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);
