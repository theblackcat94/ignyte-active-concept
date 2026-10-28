import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedStaff } from "@/lib/commerce";

export const runtime = "nodejs";

const bucket = "home-media";
const maxBytes = 50 * 1024 * 1024;
const mimeToExtension: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "video/mp4": "mp4" };
const requestSchema = z.object({ type: z.enum(["image/jpeg", "image/png", "image/webp", "video/mp4"]), size: z.number().int().positive().max(maxBytes) });

export async function POST(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (parsed.data.type !== "video/mp4" && parsed.data.size > 8 * 1024 * 1024)) {
    return NextResponse.json({ error: "Use a JPG, PNG or WebP up to 8 MB, or an MP4 up to 50 MB." }, { status: 400 });
  }
  try {
    const db = adminDb();
    const existing = await db.storage.getBucket(bucket);
    if (existing.error) {
      const created = await db.storage.createBucket(bucket, { public: true, fileSizeLimit: maxBytes, allowedMimeTypes: Object.keys(mimeToExtension) });
      if (created.error && created.error.message.toLowerCase().includes("already exists") === false) throw created.error;
    }
    const path = `${randomUUID()}.${mimeToExtension[parsed.data.type]}`;
    const signed = await db.storage.from(bucket).createSignedUploadUrl(path);
    if (signed.error) throw signed.error;
    const { data } = db.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ path, token: signed.data.token, url: data.publicUrl });
  } catch {
    return NextResponse.json({ error: "Could not prepare media upload. Check Supabase Storage access." }, { status: 503 });
  }
}
