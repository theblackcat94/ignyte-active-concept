// One source for the standalone guide and every product page.
// Jade approved the supplied ranges for customer use on 28 October 2026.
export type SizeGuideCategory = "sports-bras" | "bottoms" | "tops" | "socks";
export type SizeGuideRow = { label: string; ranges: Partial<Record<"S" | "M" | "L", readonly [number, number]>> };
export type CategoryGuide = { label: string; approved: boolean; sizes: readonly ["S", "M", "L"]; rows: SizeGuideRow[]; tips: string[]; note?: string };

export const sizeGuides: Record<SizeGuideCategory, CategoryGuide> = {
  "sports-bras": { label: "Sports bras", approved: true, sizes: ["S", "M", "L"], tips: ["Bust: Measure around the fullest part of your bust, keeping the tape level."], rows: [
    { label: "Bust", ranges: { S: [86, 90], M: [90, 94], L: [94, 98] } },
  ] },
  bottoms: { label: "Bottoms", approved: true, sizes: ["S", "M", "L"], tips: ["Waist: Measure around the natural narrowest part of your waist.", "Hips: Measure around the fullest part of your hips."], rows: [
    { label: "Waist", ranges: { S: [66, 70], M: [70, 74], L: [74, 78] } },
    { label: "Hips", ranges: { S: [91, 95], M: [95, 99], L: [99, 103] } },
  ] },
  tops: { label: "Tops", approved: true, sizes: ["S", "M", "L"], tips: ["Bust: Measure around the fullest part of your bust, keeping the tape level.", "Waist: Measure around the natural narrowest part of your waist."], rows: [
    { label: "Bust", ranges: { S: [86, 90], M: [90, 94], L: [94, 98] } },
    { label: "Waist", ranges: { S: [66, 70], M: [70, 74], L: [74, 78] } },
  ] },
  socks: { label: "Socks", approved: true, sizes: ["S", "M", "L"], rows: [], tips: [],
    note: "One size. Contact us if you would like fit advice before ordering." },
};

export function guideCategoryForProduct(category: string): SizeGuideCategory {
  if (category === "sports-bras") return "sports-bras";
  if (category === "tops") return "tops";
  if (category === "accessories") return "socks";
  return "bottoms";
}
