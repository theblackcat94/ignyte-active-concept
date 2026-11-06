import { adminDb } from "@/lib/commerce";
import { sendSesMail, sesMailConfigured } from "@/lib/ses-mailer";
import type { EmailDesign } from "@/lib/email-templates";

export const returnMailEnabled = () => process.env.RETURNS_NOTIFICATIONS_ENABLED === "true" && sesMailConfigured();

export async function queueReturnEmail(eventKey: string, returnId: string, recipient: string, message: EmailDesign) {
  const { error } = await adminDb().from("return_email_outbox").upsert({ event_key: eventKey, return_id: returnId, recipient, subject: message.subject, html_body: message.html, text_body: message.text }, { onConflict: "event_key", ignoreDuplicates: true });
  if (error) throw error;
  if (returnMailEnabled()) await sendQueuedReturnEmail(eventKey);
}

export async function sendQueuedReturnEmail(eventKey: string) {
  if (!returnMailEnabled()) return false;
  const db = adminDb();
  const now = new Date().toISOString();
  const { data: claimed, error } = await db.from("return_email_outbox").update({ claimed_at: now }).eq("event_key", eventKey).is("sent_at", null).is("claimed_at", null).select("id,recipient,subject,html_body,text_body,attempt_count").maybeSingle();
  if (error) throw error;
  if (!claimed) return false;
  try {
    await sendSesMail({ to: claimed.recipient, message: { subject: claimed.subject, html: claimed.html_body, text: claimed.text_body } });
    await db.from("return_email_outbox").update({ sent_at: new Date().toISOString(), attempt_count: claimed.attempt_count + 1, last_error: null }).eq("id", claimed.id);
    return true;
  } catch (cause) {
    await db.from("return_email_outbox").update({ claimed_at: null, attempt_count: claimed.attempt_count + 1, last_error: cause instanceof Error ? cause.message.slice(0, 200) : "Delivery failed" }).eq("id", claimed.id);
    return false;
  }
}
