// Gallery films are verified 9:16 rotation clips from IGNYTE Organised Rotation Clips.
// See docs/product-rotation-video-mapping.md for the source and product/colour audit.
const filmedSlugs = [
  "aura-halter-espresso",
  "aura-halter-aurora",
  "seamless-legging-espresso",
  "seamless-legging-aurora",
  "seamless-sports-bra-espresso",
  "seamless-sports-bra-aurora",
  "seamless-short-espresso",
  "vyper-sports-bra-black",
  "vyper-sports-bra-mauve",
  "motion-sports-bra-black",
  "motion-sports-bra-aurora",
  "all-in-motion-shorts-black",
  "all-in-motion-shorts-aurora",
  "sculpt-shorts-black",
  "sculpt-shorts-mauve",
] as const;

const availableFilms = new Set<string>(filmedSlugs);

export function productFilmFor(slug?: string) {
  if (!slug || !availableFilms.has(slug)) return null;
  // The Vyper Mauve v02 clip shows the Vyper bra and matching Sculpt shorts.
  if (["motion-sports-bra-black", "sculpt-shorts-black", "sculpt-shorts-mauve", "vyper-sports-bra-mauve"].includes(slug)) return {
    video_url: `/images/product-videos/${slug}-v02.mp4`,
    video_poster: `/images/product-videos/${slug}-v02-poster.jpg`,
  };
  return {
    video_url: `/images/product-videos/${slug}.mp4?v=20261102`,
    video_poster: `/images/product-videos/${slug}-poster.jpg?v=20261102b`,
  };
}
