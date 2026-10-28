import copy from "@/data/product-seo.json";

const entries = copy as Record<string, { title: string; description: string }>;

export function productSeo(name: string, color: string, visibleDescription: string) {
  if (name.toLowerCase().includes("sock")) return { title: "IGNYTE White Crew Socks | Ignyte Active", description: "Finish your outfit with IGNYTE white crew socks. Featuring ribbed cuffs and signature branding, they pair with your favourite activewear for the gym and beyond." };
  const entry = entries[name];
  if (!entry) return { title: `${name} in ${color} | Ignyte Active`, description: visibleDescription };
  const title = entry.title.startsWith(name) ? `${name} in ${color}${entry.title.slice(name.length)}` : entry.title;
  return { title, description: entry.description };
}
