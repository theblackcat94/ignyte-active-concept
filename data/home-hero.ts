export type HomeHeroSlide = {
  id: string;
  enabled: boolean;
  kind: "image" | "video";
  desktopSrc: string;
  mobileSrc: string;
  poster: string;
  alt: string;
  kicker: string;
  title: string;
  href: string;
  action: string;
};

export type HomeHeroSettings = { slides: HomeHeroSlide[] };

export const defaultHomeHeroSettings: HomeHeroSettings = { slides: [
  { id: "hero-film", enabled: true, kind: "video", desktopSrc: "/images/home/Ignyte-Hero-Trimmed-11sec.mp4", mobileSrc: "/images/home/Ignyte-Vertical-NoSound-11sec-Compressed.mp4", poster: "/images/home/Home-Hero-Video-Fallback.jpg", alt: "Ignyte training campaign video", kicker: "HIGH-PERFORMANCE ACTIVEWEAR_", title: "Built for the burn", href: "/shop", action: "SHOP ALL" },
  { id: "sports-bras", enabled: true, kind: "image", desktopSrc: "/images/home/Home-Hero-1.jpg", mobileSrc: "", poster: "", alt: "Blonde athlete training with battle ropes", kicker: "SPORTS BRAS_", title: "Support every move.", href: "/shop/sports-bras", action: "SHOP SPORTS BRAS" },
  { id: "tops", enabled: true, kind: "image", desktopSrc: "/images/home/Home-Hero-Alt-3.jpg", mobileSrc: "", poster: "", alt: "Athlete training in an Ignyte brown top", kicker: "TOPS_", title: "Made to move.", href: "/shop/tops", action: "SHOP TOPS" },
  { id: "shorts", enabled: true, kind: "image", desktopSrc: "/images/home/Home-Hero-Alt-4.jpg", mobileSrc: "", poster: "", alt: "Two athletes training on ergs", kicker: "SHORTS_", title: "Move your way.", href: "/shop/shorts", action: "SHOP SHORTS" },
  { id: "about", enabled: true, kind: "image", desktopSrc: "/images/home/Home-Hero-Alt-2-v2.jpg", mobileSrc: "", poster: "", alt: "Two Ignyte athletes posing in the gym", kicker: "ABOUT IGNYTE_", title: "Bring your fire.", href: "/about", action: "OUR STORY" },
] };

export function homeHeroMediaUrl(src: string): string {
  return src.startsWith("/images/") ? `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${src}` : src;
}
