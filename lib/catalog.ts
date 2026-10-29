import { asset } from "./asset";
import prepared from "@/data/jacob-catalog-2026-10-27.json";
import { pdpFor, type PdpContent } from "@/data/pdp-planner";
import { displayColour } from "./display-colour";
import { productShortDescription } from "./product-short-description";
import { mappedProductAttributes } from "@/data/product-attributes";

export type Category = string;
export type Product = {
  slug: string;
  name: string;
  category: string;
  price: number;
  color: string;
  plannerProductId?: string;
  fitAttribute?: string;
  coverageAttribute?: string;
  image: string;
  gallery: { image: string; alt: string }[];
  label?: string;
  description: string;
  originalPrice?: number;
  variants?: { id: string; size: string; price: number; originalPrice?: number; stock: number }[];
  pdp: PdpContent;
};

const coverImage = (name: string) => asset(`/images/collection-covers/${name}`);

// Local preview mirrors the approved media set. Live prices and stock come from Supabase.
const featuredSlugs = ["aura-halter-lavender", "seamless-legging-lavender", "seamless-short-espresso", "seamless-sports-bra-espresso"];
export const products: Product[] = prepared.products.map(item => ({
  slug: item.slug, name: item.name, category: item.category, color: displayColour(item.color),
  ...mappedProductAttributes(item.variants.map(variant => variant.sku)),
  description: productShortDescription(item.name, item.slug, displayColour(item.description)), image: asset(item.image_path),
  pdp: pdpFor(item.name, null, item.slug),
  gallery: item.gallery.map(entry => ({ image: asset(entry.image), alt: displayColour(entry.alt) })),
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
  { id: "leggings", label: "Leggings", cover: coverImage("Ignyte-Leggings-2.jpg") },
  { id: "shorts", label: "Shorts", cover: coverImage("Ignyte-Shorts.jpg") },
  { id: "accessories", label: "Accessories", cover: coverImage("Ignyte-Accessories.jpg") }
];

export const money = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);
