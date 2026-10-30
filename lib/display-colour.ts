// Keep existing slugs, image paths, SKUs and database identifiers stable.
export function displayColour(text: string, preserveJacaranda = false): string {
  return text.replace(preserveJacaranda ? /\bLavender\b/gi : /\b(?:Jacaranda|Lavender)\b/gi, "Aurora");
}
