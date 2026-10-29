import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/commerce";
import { ewayEnvironment, getEwayTransaction } from "@/lib/eway";
import { queuePaymentConfirmedEmails } from "@/lib/order-email-outbox";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const accessCode = request.nextUrl.searchParams.get("AccessCode");
  const environment = ewayEnvironment();
  if (!accessCode || accessCode.length > 512 || !environment) {
    return NextResponse.json({ error: "Payment result is unavailable." }, { status: 400 });
  }
  const db = adminDb();
  const { data: order, error } = await db.from("orders")
    .select("id,user_id,status,total_cents,eway_access_code,eway_environment,eway_transaction_id")
    .eq("eway_access_code", accessCode).maybeSingle();
  if (error || !order || order.eway_environment !== environment) {
    return NextResponse.json({ error: "Payment result is unavailable." }, { status: 404 });
  }
  if (order.status === "paid" && order.eway_transaction_id) {
    try { await queuePaymentConfirmedEmails(order.id); }
    catch (emailError) { console.error("Could not queue paid order emails", emailError instanceof Error ? emailError.message : "Unknown error"); }
    return NextResponse.json({ status: "paid", orderId: order.id, guest: !order.user_id }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const transaction = await getEwayTransaction(accessCode);
    if (transaction.invoiceReference !== order.id ||
        transaction.totalCents !== order.total_cents ||
        (transaction.currencyCode !== null && transaction.currencyCode !== "AUD")) {
      console.error("Eway payment result did not match order", order.id);
      return NextResponse.json({ error: "Payment needs manual review. Please contact support with your order number.", orderId: order.id }, { status: 409 });
    }
    if (!transaction.paid) {
      return NextResponse.json({ status: "not_paid", orderId: order.id, guest: !order.user_id }, { headers: { "Cache-Control": "no-store" } });
    }
    const { error: completeError } = await db.rpc("complete_eway_order", {
      p_order_id: order.id, p_access_code: accessCode,
      p_transaction_id: transaction.transactionId, p_total_cents: transaction.totalCents,
      p_environment: environment,
    });
    if (completeError) throw completeError;
    try { await queuePaymentConfirmedEmails(order.id); }
    catch (emailError) { console.error("Could not queue paid order emails", emailError instanceof Error ? emailError.message : "Unknown error"); }
    return NextResponse.json({ status: "paid", orderId: order.id, guest: !order.user_id }, { headers: { "Cache-Control": "no-store" } });
  } catch (failure) {
    console.error("Eway result check failed", failure instanceof Error ? failure.message : "Unknown error");
    return NextResponse.json({ error: "Payment needs verification. Please keep your order number and contact support.", orderId: order.id }, { status: 503 });
  }
}
