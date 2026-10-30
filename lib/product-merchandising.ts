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

export function productFamily(product: Product): string {
  return `${product.category}:${product.name.trim().toLowerCase()}`;
}

export function distinctAvailableProducts(candidates: Product[], excluded: Product[] = []): Product[] {
  const seen = new Set(excluded.map(productFamily));
  return candidates.filter(product => {
    const family = productFamily(product);
    if (!inStock(product) || seen.has(family)) return false;
    seen.add(family);
    return true;
  });
}

export function youMayAlsoLikeProducts(current: Product, catalog: Product[], alreadyShown: Product[]): Product[] {
  const excluded = new Set([current, ...alreadyShown].map(productFamily));
  const activities = new Set(current.pdp.activities.map(activity => activity.trim().toLowerCase()));
  const candidates = catalog.filter(product => inStock(product) && !excluded.has(productFamily(product)))
    .map(product => ({
      product,
      score: (product.category === current.category ? 4 : 0)
        + product.pdp.activities.filter(activity => activities.has(activity.trim().toLowerCase())).length * 2
        + (product.fitAttribute && product.fitAttribute === current.fitAttribute ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.product.slug.localeCompare(b.product.slug))
    .map(({ product }) => product);
  const unique = distinctAvailableProducts(candidates);
  const categories = new Set<string>();
  const mix = unique.filter(product => {
    if (categories.has(product.category)) return false;
    categories.add(product.category);
    return true;
  });
  return [...mix, ...unique.filter(product => !mix.includes(product))].slice(0, 12);
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
