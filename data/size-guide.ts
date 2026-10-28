// One source for the standalone guide and every product page.
// Add approved ranges in centimetres to each row's ranges object when provided.
export type SizeGuideCategory = "sports-bras" | "bottoms" | "tops" | "socks";
export type SizeGuideRow = { label: string; ranges: Partial<Record<"S" | "M" | "L", string>> };
export type CategoryGuide = { label: string; sizes: readonly ["S", "M", "L"]; rows: SizeGuideRow[]; tips: string[]; note?: string };

export const sizeGuides: Record<SizeGuideCategory, CategoryGuide> = {
  "sports-bras": { label: "Sports bras", sizes: ["S", "M", "L"], tips: ["Measure bust around the fullest part of your chest.", "Measure underbust directly below your bust, keeping the tape level."], rows: [
    { label: "Bust", ranges: {} },
    { label: "Underbust", ranges: {} },
  ] },
  bottoms: { label: "Bottoms", sizes: ["S", "M", "L"], tips: ["Measure waist around your natural waist.", "Measure hips around the fullest part with your feet together."], rows: [
    { label: "Waist", ranges: {} },
    { label: "Hips", ranges: {} },
  ] },
  tops: { label: "Tops", sizes: ["S", "M", "L"], tips: ["Measure bust around the fullest part of your chest.", "Measure waist around your natural waist."], rows: [
    { label: "Bust", ranges: {} },
    { label: "Waist", ranges: {} },
  ] },
  socks: { label: "Socks", sizes: ["S", "M", "L"], rows: [], tips: [],
    note: "Our socks are currently offered in one size. Contact us if you would like fit advice before ordering." },
};

export function guideCategoryForProduct(category: string): SizeGuideCategory {
  if (category === "sports-bras") return "sports-bras";
  if (category === "tops") return "tops";
  if (category === "accessories") return "socks";
  return "bottoms";
}
