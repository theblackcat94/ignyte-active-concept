// Product page slugs changed after Aurora became the approved customer colour.
// The underlying media filenames and JAC SKU identifiers remain unchanged.
export const auroraProductSlugs: Record<string, string> = {
  "aura-halter-lavender": "aura-halter-aurora",
  "seamless-legging-lavender": "seamless-legging-aurora",
  "seamless-sports-bra-jacaranda": "seamless-sports-bra-aurora",
  "motion-sports-bra-jacaranda": "motion-sports-bra-aurora",
  "all-in-motion-shorts-jacaranda": "all-in-motion-shorts-aurora",
  "seamless-short-jacaranda": "seamless-short-aurora",
};

export function currentProductSlug(slug: string) {
  return auroraProductSlugs[slug] ?? slug;
}
