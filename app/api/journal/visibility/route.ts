import { NextResponse } from "next/server";
import { journalVisibility } from "@/lib/journal";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json({ public: await journalVisibility() === "public" }, { headers: { "Cache-Control": "no-store" } }); }
