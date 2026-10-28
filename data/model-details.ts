// Product/colour assignments from the updated Product Upload Planner supplied on 28 October 2026.
// Measurements were supplied by the Ignyte team for Lauren and Mel.
const lauren = "Lauren\nBust: 86 cm\nWaist: 65 cm\nHips: 85 cm\nWears: Small";
const mel = "Mel\nHeight: 179 cm\nBust: 81 cm · Cup: DD\nWaist: 68 cm\nHips: 96 cm\nWears: Small in tops and bottoms\nDress size: UK 6–8";

export const modelPortraits: Record<string, string> = {
  Lauren: "/images/jacob-2026-10/ign-motsbr-blk/ign-motsbr-blk-motion-sports-bra-black-main-01.jpg",
  Mel: "/images/jacob-2026-10/ign-halt-drkbrn/ign-halt-drkbrn-aura-halter-top-espresso-main-01.jpg",
};

export const modelDetailsBySlug: Record<string, string> = {
  "aura-halter-espresso": mel,
  "aura-halter-lavender": lauren,
  "all-in-motion-shorts-black": lauren,
  "all-in-motion-shorts-jacaranda": mel,
  "motion-sports-bra-black": lauren,
  "motion-sports-bra-jacaranda": mel,
  "sculpt-shorts-black": mel,
  "sculpt-shorts-mauve": mel,
  "seamless-legging-espresso": mel,
  "seamless-legging-lavender": mel,
  "seamless-short-espresso": mel,
  "vyper-sports-bra-black": mel,
  "vyper-sports-bra-mauve": mel,
  "seamless-sports-bra-espresso": mel,
  "seamless-sports-bra-jacaranda": mel,
};
