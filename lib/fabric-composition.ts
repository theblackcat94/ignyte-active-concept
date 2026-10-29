const labels: Record<string, string> = { Outer: "Outer fabric", Main: "Main fabric" };

export function fabricCompositions(value: string): { label: string; composition: string }[] {
  if (!value.trim()) return [];
  return value.trim().split(/\.\s+(?=[A-Z][A-Za-z ]+:)/).map((part, index, all) => {
    const text = index < all.length - 1 && !part.endsWith(".") ? `${part}.` : part;
    const match = text.match(/^([^:]+):\s*(.+)$/);
    return match ? { label: labels[match[1].trim()] ?? match[1].trim(), composition: match[2].trim() } : { label: "Fabric", composition: text.trim() };
  });
}
