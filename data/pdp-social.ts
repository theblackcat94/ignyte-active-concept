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
  cropX?: number;
  cropY?: number;
};

export type PdpSocialSettings = { enabled: boolean; posts: PdpSocialPost[]; coversVersion?: number; automatic?: boolean; cachedPosts?: PdpSocialPost[]; lastRefresh?: string };

// Supplied covers, kept in the same order as the linked Instagram posts.
export const socialCoverImages = [
  "/images/instagram/01_De8vidKvamy.jpg",
  "/images/instagram/02_DdvnCY3ii41.jpg",
  "/images/instagram/03_De2r1sZyQYS.jpg",
  "/images/instagram/04_Ded58Prv8I2.jpg",
  "/images/instagram/05_Dedp7U4PLHp.jpg",
  "/images/instagram/06_DeGq_vJj2Kq.jpg",
  "/images/instagram/07_Dea7TywSYHZ.jpg",
  "/images/instagram/08_Dd0oO4zvIO6.jpg",
  "/images/instagram/09_DeUHvweyJJx.jpg",
  "/images/instagram/10_Dds4WdxvhIC.jpg",
] as const;

export const suppliedSocialCovers: Record<string, string> = Object.fromEntries(
  socialCoverImages.map(image => [image.split("/").at(-1)!.replace(/^\d+_/, "").replace(/\.jpg$/, ""), image]),
);

const instagramGrid = [
  ["reel", "De8vidKvamy"], ["p", "DdvnCY3ii41"], ["p", "De2r1sZyQYS"],
  ["reel", "Ded58Prv8I2"], ["p", "Dedp7U4PLHp"], ["p", "DeGq_vJj2Kq"],
  ["reel", "Dea7TywSYHZ"], ["p", "Dd0oO4zvIO6"], ["reel", "DeUHvweyJJx"],
  ["p", "Dds4WdxvhIC"],
] as const;

// Posts shown on @ignyteactive's public profile on 29 October 2026. Admin can curate them later.
export const defaultPdpSocialSettings: PdpSocialSettings = {
  enabled: true,
  coversVersion: 1,
  posts: instagramGrid.map(([kind, code], index) => ({
    id: `instagram-${code}`, enabled: true, embed: true,
    href: `https://www.instagram.com/${index === 6 ? "cara.mel95/" : index === 8 ? "train_withsis/" : "ignyteactive/"}${kind}/${code}/`, image: socialCoverImages[index],
    alt: `Ignyte Active Instagram ${kind === "reel" ? "reel" : "post"} ${index + 1}`,
    caption: kind === "reel" ? "WATCH REEL" : "VIEW POST", productSlugs: [],
  })),
};
