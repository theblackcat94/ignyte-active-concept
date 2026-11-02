// Only Seamless Shorts was renamed from Jacaranda to Aurora.
// Legacy Lavender copy is also displayed as Aurora for that product only.
export function displayColour(text: string, productSlug?: string): string {
  return productSlug === "seamless-short-aurora"
    ? text.replace(/\b(?:Jacaranda|Lavender)\b/gi, "Aurora")
    : text;
}
