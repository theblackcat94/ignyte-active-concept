// One source for the standalone guide and every product page.
// Jade approved the original bust, waist and hip ranges on 28 October 2026.
// Underbust and AU bra equivalents are approximate references pending brand fit review.
export type SizeGuideCategory = "sports-bras" | "bottoms" | "tops" | "socks";
export const sockSizing = {
  variant: "One size",
  range: "4.5–7.5",
  guideText: "These socks are designed to fit US women’s shoe sizes 4.5–7.5.",
  productText: "Fits US women’s shoe sizes 4.5–7.5.",
} as const;
export type SizeGuideRow = { label: string; ranges: Partial<Record<"S" | "M" | "L", readonly [number, number]>> };
export type CategoryGuide = { label: string; approved: boolean; sizes: readonly ["S", "M", "L"]; rows: SizeGuideRow[]; tips: string[]; note?: string; auBraEquivalents?: Record<"S" | "M" | "L", string> };

export const sizeGuides: Record<SizeGuideCategory, CategoryGuide> = {
  "sports-bras": { label: "Sports bras", approved: true, sizes: ["S", "M", "L"], tips: ["Bust: Measure around the fullest part of your bust, keeping the tape level.", "Underbust: Measure around your ribcage directly beneath your bust. Use both measurements to find an AU bra size; equivalents are a starting point, not a fit guarantee."], auBraEquivalents: { S: "10C–D / 12A–B", M: "10DD–E / 12B–D", L: "12D–E / 14B–C" }, rows: [
    { label: "Bust", ranges: { S: [86, 90], M: [90, 94], L: [94, 98] } },
    { label: "Underbust", ranges: { S: [68, 77], M: [68, 82], L: [73, 82] } },
  ] },
  bottoms: { label: "Bottoms", approved: true, sizes: ["S", "M", "L"], tips: ["Waist: Measure around the natural narrowest part of your waist.", "Hips: Measure around the fullest part of your hips."], rows: [
    { label: "Waist", ranges: { S: [66, 70], M: [70, 74], L: [74, 78] } },
    { label: "Hips", ranges: { S: [91, 95], M: [95, 99], L: [99, 103] } },
  ] },
  tops: { label: "Tops", approved: true, sizes: ["S", "M", "L"], tips: ["Bust: Measure around the fullest part of your bust, keeping the tape level.", "Waist: Measure around the natural narrowest part of your waist."], rows: [
    { label: "Bust", ranges: { S: [86, 90], M: [90, 94], L: [94, 98] } },
    { label: "Waist", ranges: { S: [66, 70], M: [70, 74], L: [74, 78] } },
  ] },
  socks: { label: "Socks", approved: true, sizes: ["S", "M", "L"], rows: [], tips: [] },
};

export function guideCategoryForProduct(category: string): SizeGuideCategory {
  if (category === "sports-bras") return "sports-bras";
  if (category === "tops") return "tops";
  if (category === "accessories") return "socks";
  return "bottoms";
}
