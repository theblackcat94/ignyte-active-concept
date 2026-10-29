// Keep existing slugs, image paths, SKUs and database identifiers stable.
export function displayColour(text: string): string {
  return text.replace(/\b(?:Jacaranda|Lavender)\b/gi, "Aurora");
}
