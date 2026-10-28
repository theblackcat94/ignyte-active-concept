export type PdpSocialPost = {
  id: string;
  enabled: boolean;
  href: string;
  image: string;
  video?: string;
  embed?: boolean;
  alt: string;
  caption: string;
  productSlugs: string[];
};

export type PdpSocialSettings = { enabled: boolean; posts: PdpSocialPost[] };

// Editorial covers for linked posts until the team uploads the matching post media.
export const socialCoverImages = [
  "/images/home/Home-Hero-Alt-2-v2.jpg",
  "/images/home/Home-Hero-Alt-3.jpg",
  "/images/home/Home-Hero-Alt-4.jpg",
  "/images/home/Home-Hero-Alt-5.jpg",
  "/images/home/Home-Hero-Alt-6.jpg",
  "/images/home/Ignyte-Sports-Bras-Vertical.jpg",
  "/images/home/Ignyte-Shorts-Vertical.jpg",
  "/images/home/Ignyte-Leggings-Vertical.jpg",
  "/images/about/Ignyte-About-Mission.jpg",
  "/images/home/Home-Hero-1.jpg",
] as const;

const instagramGrid = [
  ["reel", "De8vidKvamy"], ["p", "DdvnCY3ii41"], ["p", "De2r1sZyQYS"],
  ["reel", "Ded58Prv8I2"], ["p", "Dedp7U4PLHp"], ["p", "DeGq_vJj2Kq"],
  ["reel", "Dea7TywSYHZ"], ["p", "Dd0oO4zvIO6"], ["reel", "DeUHvweyJJx"],
  ["p", "Dds4WdxvhIC"],
] as const;

// Posts shown on @ignyteactive's public profile on 29 October 2026. Admin can curate them later.
export const defaultPdpSocialSettings: PdpSocialSettings = {
  enabled: true,
  posts: instagramGrid.map(([kind, code], index) => ({
    id: `instagram-${code}`, enabled: true, embed: true,
    href: `https://www.instagram.com/${kind}/${code}/`, image: "",
    alt: `Ignyte Active Instagram ${kind === "reel" ? "reel" : "post"} ${index + 1}`,
    caption: kind === "reel" ? "WATCH REEL" : "VIEW POST", productSlugs: [],
  })),
};
