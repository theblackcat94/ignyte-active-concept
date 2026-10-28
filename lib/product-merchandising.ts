import type { Product } from "@/lib/catalog";
import pairings from "@/data/product-pairings.json";

type Pairing = { related: string[]; upsell: string | null; crossSell: string | null };
const recommendations = pairings as Record<string, Pairing>;

export function productPairing(slug: string): Pairing {
  return recommendations[slug] ?? { related: [], upsell: null, crossSell: null };
}

export function inStock(product: Product): boolean {
  return Boolean(product.variants?.some(variant => variant.stock > 0));
}

export function pairedProducts(slug: string, catalog: Product[], kind: "related" | "upsell" | "crossSell"): Product[] {
  const pairing = productPairing(slug);
  const slugs = kind === "related" ? pairing.related : [pairing[kind]];
  return slugs.flatMap(target => target ? catalog.filter(product => product.slug === target && inStock(product)) : []);
}

export function bagRecommendations(slugs: string[], catalog: Product[]): Product[] {
  const excluded = new Set(slugs);
  const candidates = slugs.flatMap(slug => {
    const pairing = productPairing(slug);
    return [pairing.crossSell, ...pairing.related, pairing.upsell];
  });
  const seen = new Set<string>();
  return candidates.flatMap(slug => {
    if (!slug || excluded.has(slug) || seen.has(slug)) return [];
    seen.add(slug);
    const product = catalog.find(item => item.slug === slug);
    return product && inStock(product) ? [product] : [];
  }).slice(0, 3);
}
