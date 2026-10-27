import { NextResponse } from "next/server";
export const runtime = "nodejs";
const allowed = ["USD", "EUR", "GBP", "NZD", "CAD", "SGD", "JPY"];
export async function GET() {
  try {
    const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=aud&quotes=${allowed.join(",").toLowerCase()}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw Error("Rate source unavailable");
    const rows = await response.json() as { date: string; quote: string; rate: number }[];
    const rates: Record<string, number> = {};
    for (const row of rows) if (allowed.includes(row.quote) && Number.isFinite(row.rate) && row.rate > 0) rates[row.quote] = row.rate;
    if (!Object.keys(rates).length) throw Error("No rates");
    return NextResponse.json({ date: rows[0]?.date, rates, source: "Frankfurter" });
  } catch { return NextResponse.json({ error: "Currency estimates unavailable" }, { status: 503 }); }
}
