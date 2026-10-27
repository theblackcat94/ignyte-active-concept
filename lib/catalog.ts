import { asset } from "./asset";

export type Category = "all" | "sports-bras" | "tops" | "leggings" | "shorts";

export type Product = {
  slug: string;
  name: string;
  category: Exclude<Category, "all">;
  price: number;
  color: string;
  image: string;
  label?: string;
  description: string;
};

// Concept catalogue: replace with approved imagery, product data and listing rules.
export const products: Product[] = [
  { slug: "aura-halter-espresso", name: "Aura Halter", category: "tops", price: 60, color: "Espresso", image: asset("/images/product-halter.png"), label: "BEST SELLER", description: "A sleek halter silhouette for the sessions you show up for." },
  { slug: "seamless-legging-black", name: "Seamless Legging", category: "leggings", price: 70, color: "Black", image: asset("/images/product-leggings.png"), label: "NEW", description: "A second-skin feel with a confident, supportive fit." },
  { slug: "seamless-short-black", name: "Seamless Short", category: "shorts", price: 60, color: "Black", image: asset("/images/product-shorts.png"), description: "Freedom to move, from warm-up to the last rep." },
  { slug: "seamless-sports-bra-espresso", name: "Seamless Sports Bra", category: "sports-bras", price: 55, color: "Espresso", image: asset("/images/campaign-studio.png"), label: "POPULAR", description: "Steady support for training days and everything after." },
  { slug: "aura-halter-black", name: "Aura Halter", category: "tops", price: 60, color: "Black", image: asset("/images/campaign-training.png"), description: "A streamlined training layer with a bold feel." },
  { slug: "seamless-legging-espresso", name: "Seamless Legging", category: "leggings", price: 70, color: "Espresso", image: asset("/images/campaign-studio.png"), description: "Made to move with you through every session." }
];

export const categories: { id: Category; label: string; image?: string }[] = [
  { id: "all", label: "Shop all" },
  { id: "sports-bras", label: "Sports bras", image: asset("/images/campaign-studio.png") },
  { id: "tops", label: "Tops", image: asset("/images/product-halter.png") },
  { id: "leggings", label: "Leggings", image: asset("/images/product-leggings.png") },
  { id: "shorts", label: "Shorts", image: asset("/images/campaign-training.png") }
];

export const money = (value: number) => `$${value.toFixed(0)}`;
