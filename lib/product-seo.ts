import copy from "@/data/product-seo.json";

const entries = copy as Record<string, { title: string; description: string }>;

export function productSeo(name: string, color: string, visibleDescription: string) {
  const entry = entries[name];
  if (!entry) return { title: `${name} in ${color} | Ignyte Active`, description: visibleDescription };
  const title = entry.title.startsWith(name) ? `${name} in ${color}${entry.title.slice(name.length)}` : entry.title;
  return { title, description: entry.description };
}
