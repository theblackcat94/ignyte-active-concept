import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/commerce";
import { sendSesMail, sesMailConfigured } from "@/lib/ses-mailer";

export const runtime = "nodejs";
const productSchema = z.object({ id: z.string().max(100), slug: z.string().regex(/^[a-z0-9-]+$/).max(120), name: z.string().max(120), url: z.url().max(500), color: z.string().max(80), size: z.string().max(40).nullable(), category: z.enum(["Sizing & Fit", "Fabric & Product Details", "Shipping & Delivery", "Returns & Exchanges", "Stock & Availability", "Something Else"]) });
const schema = z.object({ name: z.string().trim().min(2).max(120), email: z.email().trim().toLowerCase(), orderNumber: z.string().trim().max(100).optional(), message: z.string().trim().min(10).max(4000), website: z.string().max(0), product: productSchema.optional() });
const html = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] || character);
const attempts = new Map<string, number>();
export async function POST(request: Request) {
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: "Check the contact details and message." }, { status: 400 });
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  if (attempts.size > 1000) for (const [key, time] of attempts) if (now - time > 60_000) attempts.delete(key);
  if (now - (attempts.get(address) ?? 0) < 60_000) return NextResponse.json({ error: "Please wait a minute before sending another message." }, { status: 429 });
  attempts.set(address, now);
  const context = input.data.product;
  const details = context ? `\n\nProduct: ${context.name}\nProduct ID: ${context.id}\nProduct URL: ${context.url}\nColour: ${context.color}\nSize: ${context.size || "Not selected"}\nQuestion category: ${context.category}` : "";
  const fullMessage = input.data.message + details;
  if (fullMessage.length > 4000) return NextResponse.json({ error: "Please shorten your question slightly." }, { status: 400 });
  const { error } = await adminDb().from("support_tickets").insert({ name: input.data.name, email: input.data.email, order_number: input.data.orderNumber || null, message: fullMessage });
  if (error) return NextResponse.json({ error: "Could not save your message. Please try again." }, { status: 503 });
  if (context && process.env.SUPPORT_EMAIL_DELIVERY_ENABLED === "true" && sesMailConfigured()) {
    const supportText = `From: ${input.data.name} <${input.data.email}>\nOrder: ${input.data.orderNumber || "Not supplied"}\n\n${fullMessage}`;
    const acknowledgement = `Hi ${input.data.name.split(/\s+/)[0]},\n\nThanks for reaching out. We've received your question about ${context.name} in ${context.color}${context.size ? `, size ${context.size}` : ""}. The IGNYTE team will reply by email.\n\nThe IGNYTE Team`;
    const results = await Promise.allSettled([
      sendSesMail({ to: "support@ignyteactive.com", message: { subject: `Product question: ${context.name}`, text: supportText, html: `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${html(supportText)}</pre>` } }),
      sendSesMail({ to: input.data.email, message: { subject: "We've received your IGNYTE question", text: acknowledgement, html: `<p style="white-space:pre-line;font-family:Arial,sans-serif">${html(acknowledgement)}</p>` } }),
    ]);
    if (results.some(result => result.status === "rejected")) console.error("A product question email could not be delivered; the support ticket remains saved.");
  }
  return NextResponse.json({ ok: true });
}
