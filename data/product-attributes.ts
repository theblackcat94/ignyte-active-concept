// Confirmed Products W/X and Colour and attributes O/P, matched through Product ID and SKU family.
// Blank values in the planner remain blank here; this never changes catalog activation or stock.
const mapped = [
  { productId: "IGN001", skuFamilies: ["IGN-HALT-DRKBRN", "IGN-HALT-JAC"], fit: "Close fit", coverage: "Extended length" },
  { productId: "IGN002", skuFamilies: ["IGN-MOTSHTS-BLK", "IGN-MOTSHTS-JAC"], fit: "Relaxed fit", coverage: "" },
  { productId: "IGN003", skuFamilies: ["IGN-MOTSBR-BLK", "IGN-MOTSBR-JAC"], fit: "Close fit", coverage: "" },
  { productId: "IGN004", skuFamilies: ["IGN-VSCLP-BLK", "IGN-VSCLP-BRN"], fit: "Close fit", coverage: "" },
  { productId: "IGN008", skuFamilies: ["IGN-LGS-DRKBRN", "IGN-LGS-JAC"], fit: "Close fit", coverage: "Full length" },
  { productId: "IGN009", skuFamilies: ["IGN-LVR-SHTS-BRN", "IGN-LVR-SHTS-JAC"], fit: "Close fit", coverage: "Short length" },
  { productId: "IGN010", skuFamilies: ["IGN-MOMSBR-BLK", "IGN-MOMSBR-BRN"], fit: "Close fit", coverage: "" },
] as const;

export function mappedProductAttributes(skus: string[]) {
  const match = mapped.find(row => skus.some(sku => row.skuFamilies.some(family => sku === family || sku.startsWith(`${family}-`))));
  return match ? { plannerProductId: match.productId, fitAttribute: match.fit || undefined, coverageAttribute: match.coverage || undefined } : {};
}
