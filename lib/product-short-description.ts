import copy from "@/data/product-short-descriptions.json";

// Product IDs and SKU families are the planner's stable identities. Held
// products have copy here but are not added to the storefront catalogue.
const families: Record<string, { id: keyof typeof copy; slug: string }> = {
  "Aura Halter Top": { id: "IGN001", slug: "aura-halter-" },
  "All In Motion Shorts": { id: "IGN002", slug: "all-in-motion-shorts-" },
  "Motion Sports Bra": { id: "IGN003", slug: "motion-sports-bra-" },
  "Sculpt Shorts": { id: "IGN004", slug: "sculpt-shorts-" },
  "Fuse Sports Bra": { id: "IGN005", slug: "fuse-sports-bra-" },
  "Trinity Sports Bra": { id: "IGN007", slug: "trinity-sports-bra-" },
  "Seamless Leggings": { id: "IGN008", slug: "seamless-legging-" },
  "Seamless Shorts": { id: "IGN009", slug: "seamless-short-" },
  "Vyper Sports Bra": { id: "IGN010", slug: "vyper-sports-bra-" },
  "Seamless Sports Bra": { id: "IGN011", slug: "seamless-sports-bra-" },
  "IGNYTE Socks": { id: "IGN012", slug: "ignyte-socks-" },
};

export function productShortDescription(name: string, slug: string, fallback: string): string {
  const family = families[name];
  return family && slug.startsWith(family.slug) ? copy[family.id] : fallback;
}
