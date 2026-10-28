export type PdpSocialPost = {
  id: string;
  enabled: boolean;
  href: string;
  image: string;
  alt: string;
  caption: string;
  productSlugs: string[];
};

export type PdpSocialSettings = { enabled: boolean; posts: PdpSocialPost[] };

export const defaultPdpSocialSettings: PdpSocialSettings = { enabled: false, posts: [] };
