// Film files come from the matching product and colour SKU folders in the supplied upload.
// Each uses the folder's cut-02 web export; alternate cuts remain available for review.
const filmedSlugs = [
  "aura-halter-espresso",
  "seamless-legging-espresso",
  "seamless-legging-lavender",
  "seamless-sports-bra-espresso",
  "seamless-sports-bra-jacaranda",
  "seamless-short-espresso",
  "vyper-sports-bra-black",
  "vyper-sports-bra-mauve",
  "motion-sports-bra-black",
  "motion-sports-bra-jacaranda",
  "all-in-motion-shorts-black",
  "all-in-motion-shorts-jacaranda",
  "sculpt-shorts-black",
  "sculpt-shorts-mauve",
] as const;

const availableFilms = new Set<string>(filmedSlugs);

export function productFilmFor(slug?: string) {
  if (!slug || !availableFilms.has(slug)) return null;
  return {
    video_url: `/images/product-videos/${slug}.mp4`,
    video_poster: `/images/product-videos/${slug}-poster.jpg`,
  };
}
