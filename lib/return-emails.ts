import { escapeHtml, layout, type EmailDesign } from "@/lib/email-templates";
import type { ReturnItem } from "@/lib/returns";

export type ReturnMailRecord = { id: string; reference: string; order_number: string; customer_name: string; customer_email: string; items: ReturnItem[]; submitted_at: string; requested_resolution?: string | null };
const site = () => process.env.NEXT_PUBLIC_SITE_URL || "https://dev.ignyteactive.com";
const para = (text: string) => `<p style="margin:0 0 18px;font-size:16px;line-height:1.6">${escapeHtml(text)}</p>`;
function details(record: ReturnMailRecord) {
  const lines = record.items.map(item => `${item.product_name} / ${item.colour} / ${item.size} × ${item.quantity} — ${item.reason}`);
  const resolution = record.requested_resolution === "store_credit" ? "Store credit requested (subject to inspection, approval and confirmed credit terms)" : record.requested_resolution === "original_payment" ? "Original payment refund requested" : "Consumer law remedy to be reviewed";
  return { html: `<h2 style="font-size:15px;letter-spacing:.08em;margin:28px 0 12px">YOUR RETURN DETAILS_</h2>${para(`Return reference: ${record.reference}`)}${para(`Order number: ${record.order_number}`)}<ul style="padding-left:20px;font-size:15px;line-height:1.6">${lines.map(line => `<li>${escapeHtml(line)}</li>`).join("")}</ul>${para(resolution)}`, text: `Return reference: ${record.reference}\nOrder number: ${record.order_number}\n${lines.join("\n")}\n${resolution}` };
}
export function returnAcknowledgementEmail(record: ReturnMailRecord): EmailDesign {
  const first = record.customer_name.trim().split(/\s+/)[0]; const d = details(record);
  return { subject: "We've received your IGNYTE return request", html: layout("RETURN REQUEST RECEIVED_", "WE'VE GOT IT.", para(`Hi ${first},`) + para("Thanks for submitting your return request. We've received your details and our team will review them shortly.") + d.html + para("We'll email you with instructions once your request has been reviewed. Please don't send your items back until you receive those instructions.") + para(`If you need assistance, contact support@ignyteactive.com and quote ${record.reference}.`) + para("The IGNYTE Team"), site()), text: `Hi ${first},\n\nThanks for submitting your return request. We've received your details and our team will review them shortly.\n\n${d.text}\n\nWe'll email you with instructions once your request has been reviewed. Please don't send your items back until you receive those instructions.\n\nFor help, contact support@ignyteactive.com and quote ${record.reference}.\n\nThe IGNYTE Team` };
}
export function returnInternalEmail(record: ReturnMailRecord): EmailDesign {
  const d = details(record); const url = `${site().replace(/\/$/, "")}/admin/returns/?id=${encodeURIComponent(record.id)}`;
  return { subject: `New IGNYTE Return Request | ${record.reference}`, html: layout("NEW RETURN REQUEST_", record.reference, para(`${record.customer_name} · ${record.customer_email}`) + d.html + para(`Submitted ${new Date(record.submitted_at).toLocaleString("en-AU")}`) + `<p><a href="${escapeHtml(url)}">OPEN RETURN RECORD ↗</a></p>`, site()), text: `New return request ${record.reference}\n${record.customer_name} · ${record.customer_email}\n${d.text}\nSubmitted ${record.submitted_at}\n${url}` };
}
export function returnInstructionsEmail(record: ReturnMailRecord, settings: { return_address: string; shipping_instructions: string; instructions_email_intro: string; refund_processing_copy?: string }): EmailDesign {
  const first = record.customer_name.trim().split(/\s+/)[0]; const d = details(record);
  const steps = ["1. Prepare your parcel — Pack the approved items securely, ensuring they meet our return conditions.", "2. Include your return details — Add a handwritten or printed note with your name, order number, email, return reference and items.", `3. Send your parcel — ${settings.return_address}. ${settings.shipping_instructions}`, `4. Return inspection — Items are inspected on receipt. ${settings.refund_processing_copy || "Eligible resolutions follow approval."}`];
  return { subject: `Your IGNYTE Return Instructions | ${record.reference}`, html: layout("RETURN INSTRUCTIONS_", "LET'S GET THIS SORTED.", para(`Hi ${first},`) + para(settings.instructions_email_intro) + d.html + steps.map(para).join("") + para("For change-of-mind returns, return postage is paid by the customer and the parcel must arrive within 30 days of purchase. These conditions do not limit your Australian Consumer Law rights.") + para(`Questions? Contact support@ignyteactive.com and quote ${record.reference}.`) + para("The IGNYTE Team"), site()), text: `Hi ${first},\n\n${settings.instructions_email_intro}\n\n${d.text}\n\n${steps.join("\n\n")}\n\nFor change-of-mind returns, you pay return postage and your parcel must arrive within 30 days of purchase. These conditions do not limit Australian Consumer Law rights.\n\nQuestions? support@ignyteactive.com (quote ${record.reference}).\n\nThe IGNYTE Team` };
}

export function returnApprovalEmail(record: ReturnMailRecord & { approved_item_value_cents: number | null }): EmailDesign {
  const first = record.customer_name.trim().split(/\s+/)[0];
  const amount = record.approved_item_value_cents == null ? "" : `AU$${(record.approved_item_value_cents / 100).toFixed(2)}`;
  const resolution = record.requested_resolution === "store_credit" ? "You requested store credit. We'll confirm the credit terms and issuance details with you before it is created." : record.requested_resolution === "original_payment" ? "You requested a refund to your original payment method. We'll update you after that refund has been processed." : "Our team will confirm the appropriate remedy with you under Australian Consumer Law.";
  const message = `Your return ${record.reference} has passed inspection and been approved${amount ? ` for an item value of ${amount}` : ""}.${record.requested_resolution === "statutory_remedy" ? "" : " Original delivery charges are excluded from change-of-mind returns."}`;
  return { subject: `Your IGNYTE return is approved | ${record.reference}`, html: layout("RETURN APPROVED_", "YOUR RETURN IS APPROVED.", para(`Hi ${first},`) + para(message) + para(resolution) + para(`Questions? Contact support@ignyteactive.com and quote ${record.reference}.`) + para("The IGNYTE Team"), site()), text: `Hi ${first},\n\n${message}\n\n${resolution}\n\nQuestions? support@ignyteactive.com (quote ${record.reference}).\n\nThe IGNYTE Team` };
}

export function returnRefundEmail(record: ReturnMailRecord & { refund_amount_cents: number | null; refund_transaction_reference: string }): EmailDesign {
  const first = record.customer_name.trim().split(/\s+/)[0]; const amount = `AU$${((record.refund_amount_cents ?? 0) / 100).toFixed(2)}`;
  const message = `We have processed a refund of ${amount} for return ${record.reference} to your original payment method. Your bank or payment provider may take additional time to make the funds available.`;
  const shipping = record.requested_resolution === "statutory_remedy" ? "" : "Original delivery charges are excluded from change-of-mind refunds.";
  return { subject: `Your IGNYTE refund was processed | ${record.reference}`, html: layout("REFUND PROCESSED_", "YOUR REFUND IS ON ITS WAY.", para(`Hi ${first},`) + para(message) + para(`Transaction reference: ${record.refund_transaction_reference}`) + (shipping ? para(shipping) : "") + para(`Questions? Contact support@ignyteactive.com and quote ${record.reference}.`) + para("The IGNYTE Team"), site()), text: `Hi ${first},\n\n${message}\n\nTransaction reference: ${record.refund_transaction_reference}${shipping ? `\n\n${shipping}` : ""}\n\nQuestions? support@ignyteactive.com (quote ${record.reference}).\n\nThe IGNYTE Team` };
}
