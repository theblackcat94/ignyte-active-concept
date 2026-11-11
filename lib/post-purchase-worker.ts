import { adminDb, activeProducts } from "@/lib/commerce";
import { productPairing, productFamily, inStock } from "@/lib/product-merchandising";
import { postPurchaseEmail, type JourneyConfig, type JourneyProduct, type JourneyRecommendation, type JourneyStep } from "@/lib/post-purchase-email";
import { sendSesMail, sesMailConfigured } from "@/lib/ses-mailer";
import { CHECKOUT_MARKETING_WORDING_VERSION } from "@/lib/marketing-consent";

type Step = JourneyConfig & { delay_days: number; enabled: boolean };
type Order = { id: string; status: string; customer_email: string | null; delivered_at: string | null; delivery_confirmation_source: string | null; shipping_details: Record<string, unknown> | null };
type Job = { id: string; order_id: string; step: JourneyStep; customer_email: string; due_at: string; status: string };
const day = 86_400_000;
const localParts = (value: Date) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(value);
  const field = (key: string) => Number(parts.find(part => part.type === key)?.value ?? 0);
  return { year: field("year"), month: field("month"), date: field("day"), hour: field("hour"), minute: field("minute") };
};

/** 10 am Sydney local time on the requested calendar day, including DST changes. */
export function journeyDueAt(deliveredAt: string, delayDays: number): string {
  const delivered = localParts(new Date(deliveredAt));
  const localDate = new Date(Date.UTC(delivered.year, delivered.month - 1, delivered.date + delayDays, 10));
  let utc = localDate.getTime();
  for (let attempt = 0; attempt < 3; attempt++) {
    const actual = localParts(new Date(utc));
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.date, actual.hour, actual.minute);
    utc += localDate.getTime() - actualAsUtc;
  }
  return new Date(utc).toISOString();
}

async function setStatus(id: string, status: "suppressed" | "failed", reason: string) {
  const { error } = await adminDb().from("post_purchase_jobs").update({ status, reason, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

async function eligible(order: Order, step: JourneyStep): Promise<string | null> {
  if (order.status !== "paid" || !order.delivered_at || !order.delivery_confirmation_source || !order.customer_email) return "not_paid_or_delivery_unconfirmed";
  const db = adminDb();
  const email = order.customer_email.toLowerCase();
  const { data: subscriber, error: subscriberError } = await db.from("marketing_subscribers")
    .select("status,consent_wording_version,consent_at").eq("email", email).maybeSingle();
  if (subscriberError) throw subscriberError;
  if (subscriber?.status !== "confirmed" || subscriber.consent_wording_version !== CHECKOUT_MARKETING_WORDING_VERSION || !subscriber.consent_at) return "no_current_journey_consent";
  const { data: returns, error: returnError } = await db.from("return_requests").select("id")
    .eq("order_id", order.id).not("status", "in", '("closed","declined")').limit(1);
  if (returnError) throw returnError;
  if (returns?.length) return "unresolved_return";
  const { data: support, error: supportError } = await db.from("support_tickets").select("id")
    .eq("email", email).eq("status", "open").limit(1);
  if (supportError) throw supportError;
  if (support?.length) return "open_support_case";
  if (step === "complete_set") {
    const { data: newer, error: newerError } = await db.from("orders").select("id")
      .eq("customer_email", email).eq("status", "paid").gt("created_at", order.delivered_at).neq("id", order.id).limit(1);
    if (newerError) throw newerError;
    if (newer?.length) return "newer_purchase";
  }
  const { data: recent, error: recentError } = await db.from("post_purchase_jobs").select("id")
    .eq("customer_email", email).eq("status", "sent").gte("sent_at", new Date(Date.now() - 7 * day).toISOString()).limit(2);
  if (recentError) throw recentError;
  if ((recent?.length ?? 0) >= 2) return "frequency_limit";
  return null;
}

async function orderProducts(orderId: string, email: string): Promise<{ products: JourneyProduct[]; purchasedIds: string[] }> {
  const db = adminDb();
  const { data: items, error } = await db.from("order_items").select("product_name,sku,size,variant_id").eq("order_id", orderId).limit(20);
  if (error) throw error;
  const variantIds = [...new Set((items ?? []).map(item => item.variant_id).filter(Boolean))];
  if (!variantIds.length) return { products: [], purchasedIds: [] };
  const { data: variants, error: variantError } = await db.from("product_variants").select("id,product_id").in("id", variantIds);
  if (variantError) throw variantError;
  const productIds = [...new Set((variants ?? []).map(variant => variant.product_id))];
  const { data: catalog, error: catalogError } = await db.from("products").select("id,slug,name,color,image_path,pdp_content,status").in("id", productIds);
  if (catalogError) throw catalogError;
  const reviewed = new Set<string>();
  if (productIds.length) {
    const { data: reviews, error: reviewError } = await db.from("product_reviews").select("product_id").eq("email", email).in("product_id", productIds).neq("status", "rejected");
    if (reviewError) throw reviewError;
    for (const review of reviews ?? []) reviewed.add(review.product_id);
  }
  const products = (items ?? []).flatMap(item => {
    const variant = variants?.find(row => row.id === item.variant_id);
    const product = catalog?.find(row => row.id === variant?.product_id);
    if (!product || product.status !== "active") return [];
    return [{ name: item.product_name, colour: product.color, size: item.size, image: product.image_path, slug: product.slug,
      care: typeof product.pdp_content?.care_instructions === "string" && product.pdp_content?.care_approved ? product.pdp_content.care_instructions : undefined,
      id: product.id, reviewed: reviewed.has(product.id) }];
  });
  return { products: products as JourneyProduct[], purchasedIds: productIds };
}

async function recommendationFor(products: JourneyProduct[], purchasedIds: string[]): Promise<JourneyRecommendation | null> {
  const db = adminDb();
  const catalog = await activeProducts();
  const purchased = new Set(products.map(item => item.slug));
  const excludedFamilies = new Set(catalog.filter(item => purchased.has(item.slug)).map(productFamily));
  for (const source of products) {
    const pairing = productPairing(source.slug);
    const candidates = [pairing.crossSell, ...pairing.related, pairing.upsell].filter(Boolean) as string[];
    const matching = candidates.map(slug => catalog.find(item => item.slug === slug)).filter(item => item && inStock(item) && !purchased.has(item.slug) && !excludedFamilies.has(productFamily(item)));
    matching.sort((a, b) => Number(b?.color.toLowerCase() === source.colour.toLowerCase()) - Number(a?.color.toLowerCase() === source.colour.toLowerCase()));
    const selected = matching[0];
    if (!selected) continue;
    const { data: row } = await db.from("products").select("id").eq("slug", selected.slug).eq("status", "active").maybeSingle();
    if (!row || purchasedIds.includes(row.id)) continue;
    return { name: selected.name, colour: selected.color, image: selected.image, slug: selected.slug, priceCents: Math.round(selected.price * 100) };
  }
  return null;
}

/** Called only by the secret-protected job route. No delivery event is inferred. */
export async function processPostPurchase(): Promise<{ enrolled: number; sent: number; suppressed: number; failed: number }> {
  if (process.env.POST_PURCHASE_EMAIL_DELIVERY_ENABLED !== "true" || !sesMailConfigured()) throw new Error("Post-purchase delivery is disabled");
  const trustedDeliverySource = process.env.POST_PURCHASE_ALLOWED_DELIVERY_SOURCE;
  if (!trustedDeliverySource) throw new Error("Trusted delivery event source is not configured");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl?.startsWith("https://")) throw new Error("HTTPS site URL required");
  const db = adminDb();
  const { data: settings, error: settingsError } = await db.from("post_purchase_settings").select("enabled").eq("id", true).single();
  if (settingsError || !settings?.enabled) throw new Error("Post-purchase journey is inactive");
  const { data: steps, error: stepsError } = await db.from("post_purchase_steps").select("step,enabled,delay_days,subject,preheader,body_copy");
  if (stepsError) throw stepsError;
  const enabled = (steps as Step[]).filter(step => step.enabled);
  const result = { enrolled: 0, sent: 0, suppressed: 0, failed: 0 };
  const { data: delivered, error: deliveredError } = await db.from("orders")
    .select("id,status,customer_email,delivered_at,delivery_confirmation_source,shipping_details")
    .eq("status", "paid").not("delivered_at", "is", null).eq("delivery_confirmation_source", trustedDeliverySource)
    .gte("delivered_at", new Date(Date.now() - 2 * day).toISOString()).limit(100);
  if (deliveredError) throw deliveredError;
  for (const order of (delivered ?? []) as Order[]) for (const step of enabled) {
    if (!order.customer_email || !order.delivered_at) continue;
    if (await eligible(order, step.step)) continue;
    const { data: inserted, error } = await db.from("post_purchase_jobs").upsert({ order_id: order.id, step: step.step, customer_email: order.customer_email.toLowerCase(), delivered_at: order.delivered_at, due_at: journeyDueAt(order.delivered_at, step.delay_days) }, { onConflict: "order_id,step", ignoreDuplicates: true }).select("id");
    if (error) throw error;
    result.enrolled += inserted?.length ?? 0;
  }
  const { data: due, error: dueError } = await db.from("post_purchase_jobs").select("id,order_id,step,customer_email,due_at,status")
    .eq("status", "scheduled").lte("due_at", new Date().toISOString()).order("due_at").limit(30);
  if (dueError) throw dueError;
  for (const job of (due ?? []) as Job[]) {
    const step = enabled.find(value => value.step === job.step);
    if (!step) continue;
    if (Date.now() - new Date(job.due_at).getTime() > 48 * 3600_000) { await setStatus(job.id, "suppressed", "overdue"); result.suppressed++; continue; }
    const { data: order, error: orderError } = await db.from("orders").select("id,status,customer_email,delivered_at,delivery_confirmation_source,shipping_details").eq("id", job.order_id).single();
    if (orderError) throw orderError;
    if (order.delivery_confirmation_source !== trustedDeliverySource) { await setStatus(job.id, "suppressed", "untrusted_delivery_source"); result.suppressed++; continue; }
    const reason = await eligible(order as Order, job.step);
    if (reason) { await setStatus(job.id, "suppressed", reason); result.suppressed++; continue; }
    const { data: claimed, error: claimError } = await db.from("post_purchase_jobs")
      .update({ status: "sending", claimed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", job.id).eq("status", "scheduled").select("id").maybeSingle();
    if (claimError || !claimed) continue;
    try {
      const { products, purchasedIds } = await orderProducts(job.order_id, job.customer_email);
      if (!products.length) { await setStatus(job.id, "suppressed", "products_unavailable"); result.suppressed++; continue; }
      // Guest review verification is not yet implemented. Keep this step off until it is.
      if (job.step === "review_request") { await setStatus(job.id, "suppressed", "guest_review_verification_pending"); result.suppressed++; continue; }
      const recommendation = job.step === "complete_set" ? await recommendationFor(products, purchasedIds) : null;
      if (job.step === "complete_set" && !recommendation) { await setStatus(job.id, "suppressed", "no_relevant_available_match"); result.suppressed++; continue; }
      const { data: subscriber, error: subscriberError } = await db.from("marketing_subscribers").select("unsubscribe_token").eq("email", job.customer_email).single();
      if (subscriberError) throw subscriberError;
      const email = postPurchaseEmail(step, products, siteUrl, `${siteUrl.replace(/\/$/, "")}/unsubscribe/?token=${encodeURIComponent(subscriber.unsubscribe_token)}`, recommendation ?? undefined);
      const messageId = await sendSesMail({ to: job.customer_email, message: email });
      const { error: sentError } = await db.from("post_purchase_jobs").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: messageId, updated_at: new Date().toISOString() }).eq("id", job.id).eq("status", "sending");
      if (sentError) throw sentError;
      result.sent++;
    } catch (error) {
      console.error("Post-purchase send failed", error instanceof Error ? error.message : "Unknown error");
      // A failed/uncertain SES result is never retried automatically, preventing duplicate mail.
      await setStatus(job.id, "failed", "delivery_or_render_failed");
      result.failed++;
    }
  }
  return result;
}

export async function postPurchaseOverview() {
  const db = adminDb();
  const [{ data: settings, error: settingsError }, { data: steps, error: stepsError }, { data: jobs, error: jobsError }] = await Promise.all([
    db.from("post_purchase_settings").select("enabled,updated_at").eq("id", true).single(),
    db.from("post_purchase_steps").select("step,enabled,delay_days,subject,preheader,body_copy").order("delay_days"),
    db.from("post_purchase_jobs").select("id,order_id,step,customer_email,due_at,status,reason,sent_at,provider_message_id").order("created_at", { ascending: false }).limit(100),
  ]);
  if (settingsError || stepsError || jobsError) throw settingsError ?? stepsError ?? jobsError;
  return { settings, steps, jobs, deliveryLocked: process.env.POST_PURCHASE_EMAIL_DELIVERY_ENABLED !== "true" || !process.env.POST_PURCHASE_ALLOWED_DELIVERY_SOURCE || !process.env.POST_PURCHASE_CRON_SECRET };
}
