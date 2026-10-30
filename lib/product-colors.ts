// Colour values supplied by Jacob Cass on 28 October 2026.
// Merlot is provisional until the final brand value is confirmed.
const swatchColors: Record<string, string> = {
  espresso: "#443D42",
  jacaranda: "#9698E6",
  aurora: "#9698E6",
  black: "#1C1C20",
  mauve: "#7B5865",
  white: "#FFFFFF",
  blue: "#34496D",
  merlot: "#730039",
};

export function productColourHex(color: string): string | undefined {
  return swatchColors[color.trim().toLowerCase()];
}

// One storefront order for every product selector and colour filter.
const colourOrder = ["black", "espresso", "merlot", "blue", "jacaranda", "lavender", "aurora", "mauve", "white"];

export function compareProductColours(a: string, b: string): number {
  const first = a.trim().toLowerCase();
  const second = b.trim().toLowerCase();
  const firstRank = colourOrder.indexOf(first);
  const secondRank = colourOrder.indexOf(second);
  return (firstRank < 0 ? colourOrder.length : firstRank) - (secondRank < 0 ? colourOrder.length : secondRank)
    || first.localeCompare(second);
}
