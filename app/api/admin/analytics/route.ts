import { NextResponse } from "next/server";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await adminDb().from("site_events")
    .select("event_name,page_path,created_at").gte("created_at", since)
    .order("created_at", { ascending: false }).limit(10000);
  if (error) return NextResponse.json({ error: "Analytics unavailable" }, { status: 503 });
  const counts: Record<string, number> = {};
  const pages: Record<string, number> = {};
  const daily: Record<string, number> = {};
  for (const event of data ?? []) {
    counts[event.event_name] = (counts[event.event_name] ?? 0) + 1;
    if (event.event_name === "page_view" || event.event_name === "product_view") {
      pages[event.page_path] = (pages[event.page_path] ?? 0) + 1;
      const day = event.created_at.slice(0, 10);
      daily[day] = (daily[day] ?? 0) + 1;
    }
  }
  return NextResponse.json({ counts, topPages: Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 10),
    daily: Object.entries(daily).sort((a, b) => a[0].localeCompare(b[0])),
    truncated: (data?.length ?? 0) === 10000 });
}
