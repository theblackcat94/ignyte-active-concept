// Gallery films are verified 9:16 rotation clips from IGNYTE Organised Rotation Clips.
// See docs/product-rotation-video-mapping.md for the source and product/colour audit.
const filmedSlugs = [
  "aura-halter-espresso",
  "aura-halter-lavender",
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
    video_url: `/images/product-videos/${slug}.mp4?v=20261102`,
    video_poster: `/images/product-videos/${slug}-poster.jpg?v=20261102`,
  };
}
