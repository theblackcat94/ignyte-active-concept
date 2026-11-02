// Approved purple colourways use Aurora in customer-facing copy, while
// historical media filenames and SKU identifiers remain stable.
const auroraSlugs = new Set([
  "aura-halter-aurora", "seamless-legging-aurora", "seamless-sports-bra-aurora",
  "motion-sports-bra-aurora", "all-in-motion-shorts-aurora", "seamless-short-aurora",
]);
export function displayColour(text: string, productSlug?: string): string {
  return productSlug && auroraSlugs.has(productSlug)
    ? text.replace(/\b(?:Jacaranda|Lavender|Lilac)\b/gi, "Aurora")
    : text;
}
