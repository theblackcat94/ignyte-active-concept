import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";

export const runtime = "nodejs";
const event = z.object({
  eventName: z.enum(["page_view", "product_view", "add_to_bag", "checkout_started"]),
  path: z.string().max(180).regex(/^\/[a-z0-9/_-]*\/?$/),
});

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? "0") > 1024) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }
  const parsed = event.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  const { error } = await adminDb().from("site_events").insert({
    event_name: parsed.data.eventName, page_path: parsed.data.path,
  });
  return error ? NextResponse.json({ error: "Analytics unavailable" }, { status: 503 })
    : new Response(null, { status: 204 });
}
