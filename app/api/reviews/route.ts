import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, verifiedUser } from "@/lib/commerce";
import { sendSesMail, sesMailConfigured } from "@/lib/ses-mailer";

export const runtime = "nodejs";
const inputSchema = z.object({
  product: z.string().trim().min(1).max(120),
  rating: z.coerce.number().int().min(1).max(5),
  fit: z.enum(["runs_smaller", "true_to_size", "runs_larger"]),
  body: z.string().trim().min(20).max(3000),
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase().max(254),
  website: z.string().max(0),
});
const attempts = new Map<string, number>();

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("product");
  if (!slug || !/^[a-z0-9-]{1,120}$/.test(slug)) return NextResponse.json({ reviews: [] });
  const db = adminDb();
  const { data: product } = await db.from("products").select("id").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!product) return NextResponse.json({ reviews: [] });
  const { data, error } = await db.from("product_reviews").select("id,rating,fit_feedback,body,display_name,verified_purchase,created_at,photo_path")
    .eq("product_id", product.id).eq("status", "approved").order("created_at", { ascending: false }).limit(30);
  if (error) return NextResponse.json({ reviews: [] }, { status: 503 });
  const reviews = await Promise.all((data ?? []).map(async review => {
    const { photo_path, ...safe } = review;
    if (!photo_path) return safe;
    const { data: signed } = await db.storage.from("review-photos").createSignedUrl(photo_path, 3600);
    return { ...safe, photo_url: signed?.signedUrl ?? null };
  }));
  return NextResponse.json({ reviews }, { headers: { "Cache-Control": "public, s-maxage=60" } });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 5_500_000) return NextResponse.json({ error: "Photo must be under 5 MB." }, { status: 413 });
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (attempts.size > 1000) for (const [key, time] of attempts) if (now - time > 60_000) attempts.delete(key);
  if (now - (attempts.get(address) ?? 0) < 60_000) return NextResponse.json({ error: "Please wait a minute before sending another review." }, { status: 429 });
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Please check your review." }, { status: 400 });
  const parsed = inputSchema.safeParse(Object.fromEntries([...form.entries()].filter(([key]) => key !== "photo")));
  if (!parsed.success) return NextResponse.json({ error: "Please complete the rating, fit, review and contact details." }, { status: 400 });
  attempts.set(address, now);
  const db = adminDb();
  const { data: product } = await db.from("products").select("id").eq("slug", parsed.data.product).eq("status", "active").maybeSingle();
  if (!product) return NextResponse.json({ error: "Choose an available product." }, { status: 400 });
  const since = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: duplicate } = await db.from("product_reviews").select("id").eq("product_id", product.id)
    .eq("email", parsed.data.email).gte("created_at", since).neq("status", "rejected").limit(1);
  if (duplicate?.length) return NextResponse.json({ error: "We already have a recent review from this email for this product." }, { status: 409 });
  const user = await verifiedUser(request);
  const emailConfirmed = Boolean(user?.email && user.email.toLowerCase() === parsed.data.email && user.email_confirmed_at);
  const { data: variants } = await db.from("product_variants").select("id").eq("product_id", product.id);
  const variantIds = (variants ?? []).map(item => item.id);
  const { data: boughtItems } = variantIds.length ? await db.from("order_items").select("order_id").in("variant_id", variantIds).limit(100) : { data: [] };
  const orderIds = [...new Set((boughtItems ?? []).map(item => item.order_id))];
  const { data: purchases } = orderIds.length ? await db.from("orders").select("id").in("id", orderIds)
    .eq("customer_email", parsed.data.email).eq("status", "paid").limit(1) : { data: [] };
  const verifiedOrderId = emailConfirmed ? purchases?.[0]?.id ?? null : null;
  const photo = form.get("photo");
  let photoPath: string | null = null;
  if (photo instanceof File && photo.size) {
    if (photo.size > 5_242_880 || !["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return NextResponse.json({ error: "Use a JPEG, PNG or WebP photo under 5 MB." }, { status: 400 });
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
    const webp = new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
    if (!(photo.type === "image/jpeg" && jpeg || photo.type === "image/png" && png || photo.type === "image/webp" && webp)) return NextResponse.json({ error: "This photo format is invalid." }, { status: 400 });
    const ext = photo.type === "image/jpeg" ? "jpg" : photo.type === "image/png" ? "png" : "webp";
    photoPath = `${product.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await db.storage.from("review-photos").upload(photoPath, bytes, { contentType: photo.type, upsert: false });
    if (error) return NextResponse.json({ error: "Photo upload failed. Please try again." }, { status: 503 });
  }
  const { error } = await db.from("product_reviews").insert({ product_id: product.id, order_id: verifiedOrderId,
    rating: parsed.data.rating, fit_feedback: parsed.data.fit, body: parsed.data.body, display_name: parsed.data.name,
    email: parsed.data.email, photo_path: photoPath, verified_purchase: Boolean(verifiedOrderId) });
  if (error) {
    if (photoPath) await db.storage.from("review-photos").remove([photoPath]);
    return NextResponse.json({ error: "We could not save your review. Please try again." }, { status: 503 });
  }
  const alert = process.env.ORDER_NOTIFICATION_EMAIL;
  if (alert && sesMailConfigured()) {
    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://dev.ignyteactive.com";
    await sendSesMail({ to: alert, message: { subject: "New IGNYTE review awaiting approval", html: `<p>A product review is awaiting moderation.</p><p><a href="${site}/admin/reviews/">Open review manager</a></p>`, text: `A product review is awaiting moderation. ${site}/admin/reviews/` } }).catch(() => console.error("Review alert delivery failed"));
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
