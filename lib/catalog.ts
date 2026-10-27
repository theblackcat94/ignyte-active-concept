import { asset } from "./asset";

export type Category = "all" | "sports-bras" | "tops" | "leggings" | "shorts";
export type Product = {
  slug: string;
  name: string;
  category: Exclude<Category, "all">;
  price: number;
  color: string;
  image: string;
  gallery: { image: string; alt: string }[];
  label?: string;
  description: string;
};

const catalogImage = (name: string) => asset(`/images/catalog/${name}`);
const productImage = (name: string) => asset(`/images/product/${name}`);
const coverImage = (name: string) => asset(`/images/collection-covers/${name}`);

// Concept catalogue. Prices, sizes and descriptions still need approval before commerce launch.
export const products: Product[] = [
  { slug: "aura-halter-lavender", name: "Aura Halter", category: "tops", price: 60, color: "Lavender", image: catalogImage("aura-halter-jac.jpeg"), gallery: [
    { image: productImage("Ignyte-Material.jpg"), alt: "Ignyte activewear fabric detail" },
    { image: productImage("Ingyte-Express.jpg"), alt: "Ignyte training editorial" },
  ], label: "BEST SELLER", description: "A sleek halter silhouette for the sessions you show up for." },
  { slug: "seamless-legging-lavender", name: "Seamless Legging", category: "leggings", price: 70, color: "Lavender", image: catalogImage("seamless-legging-jac.jpeg"), gallery: [
    { image: coverImage("Ignyte-Leggings.jpg"), alt: "Ignyte leggings collection detail" },
    { image: productImage("Ignyte-Built-for-the-Burn.jpg"), alt: "Ignyte training editorial" },
  ], label: "NEW", description: "A second-skin feel with a confident, supportive fit." },
  { slug: "seamless-short-espresso", name: "Seamless Short", category: "shorts", price: 60, color: "Espresso", image: catalogImage("seamless-short-espresso.jpeg"), gallery: [
    { image: coverImage("Ignyte-Shorts.jpg"), alt: "Ignyte shorts collection detail" },
    { image: productImage("Ignyte-Movement.jpg"), alt: "Ignyte movement editorial" },
  ], description: "Freedom to move, from warm-up to the last rep." },
  { slug: "seamless-sports-bra-espresso", name: "Seamless Sports Bra", category: "sports-bras", price: 55, color: "Espresso", image: catalogImage("seamless-bra-espresso.jpeg"), gallery: [
    { image: coverImage("Ignyte-Sports-Bras.jpg"), alt: "Ignyte sports bras collection" },
    { image: productImage("Ignyte-Training.jpg"), alt: "Ignyte training editorial" },
  ], label: "POPULAR", description: "Steady support for training days and everything after." },
  { slug: "aura-halter-espresso", name: "Aura Halter", category: "tops", price: 60, color: "Espresso", image: catalogImage("aura-halter-espresso.jpeg"), gallery: [
    { image: coverImage("Ignyte-Tops.jpg"), alt: "Ignyte tops collection detail" },
    { image: productImage("Ignyte-Material-Alt.jpg"), alt: "Ignyte activewear fabric detail" },
  ], description: "A streamlined training layer with a bold feel." },
  { slug: "seamless-legging-espresso", name: "Seamless Legging", category: "leggings", price: 70, color: "Espresso", image: catalogImage("seamless-legging-espresso.jpeg"), gallery: [
    { image: coverImage("Ignyte-Leggings.jpg"), alt: "Ignyte leggings collection detail" },
    { image: productImage("Ignyte-Movement.jpg"), alt: "Ignyte movement editorial" },
  ], description: "Made to move with you through every session." }
];

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
  { id: "shorts", label: "Shorts", cover: coverImage("Ignyte-Shorts.jpg") }
];

export const money = (value: number) => `$${value.toFixed(0)}`;
