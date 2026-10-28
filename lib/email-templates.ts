/** Branded message designs. No route calls these until SES sending and an outbox are configured. */
export type EmailDesign = { subject: string; html: string; text: string };

export type EmailOrder = {
  id: string;
  items: { name: string; size: string; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number | null;
  totalCents: number | null;
  viewUrl?: string;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

const aud = (cents: number) => new Intl.NumberFormat("en-AU", {
  style: "currency", currency: "AUD",
}).format(cents / 100);

function verifiedUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Email links must use HTTPS");
  return escapeHtml(url.toString());
}

function button(label: string, href: string): string {
  return `<a href="${verifiedUrl(href)}" style="display:inline-block;background:#ff4533;color:#ffffff;text-decoration:none;padding:16px 22px;font-size:12px;font-weight:800;letter-spacing:1px">${escapeHtml(label)} &nbsp;↗</a>`;
}

function layout(eyebrow: string, title: string, content: string, siteUrl: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#f5f3ee;color:#0b1020;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #dedbd6"><tr><td style="background:#0b1020;padding:25px 32px;color:#ffffff;font-size:25px;font-weight:800;letter-spacing:4px">IGNYTE<span style="color:#ff4533">.</span></td></tr><tr><td style="padding:42px 32px 30px"><p style="margin:0 0 16px;color:#ff4533;font-size:11px;font-weight:700;letter-spacing:2px">${escapeHtml(eyebrow)}</p><h1 style="margin:0 0 20px;font-size:35px;line-height:1.1;letter-spacing:-1px">${escapeHtml(title)}</h1>${content}</td></tr><tr><td style="border-top:1px solid #dedbd6;padding:22px 32px;color:#54545a;font-size:12px;line-height:1.6">IGNYTE ACTIVE · BUILT FOR THE BURN™<br><a href="${verifiedUrl(siteUrl)}" style="color:#0b1020">Visit the store</a> · <a href="mailto:support@ignyteactive.com" style="color:#0b1020">Contact support</a></td></tr></table></td></tr></table></body></html>`;
}

const paragraph = (value: string) => `<p style="margin:0 0 22px;font-size:16px;line-height:1.6">${escapeHtml(value)}</p>`;

function orderLines(order: EmailOrder): { html: string; text: string } {
  const rows = order.items.map(item => `<tr><td style="padding:11px 0;border-bottom:1px solid #dedbd6;font-size:14px">${escapeHtml(item.name)} / ${escapeHtml(item.size)} × ${item.quantity}</td><td align="right" style="padding:11px 0;border-bottom:1px solid #dedbd6;font-size:14px">${aud(item.unitPriceCents * item.quantity)}</td></tr>`).join("");
  const shipping = order.shippingCents === null ? "To be confirmed" : aud(order.shippingCents);
  const total = order.totalCents === null ? "To be confirmed" : aud(order.totalCents);
  return {
    html: `<p style="margin:0 0 12px;font-size:13px;font-weight:700">ORDER ${escapeHtml(order.id)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border-top:1px solid #dedbd6">${rows}<tr><td style="padding:12px 0;font-size:13px">Subtotal (GST inclusive)</td><td align="right" style="font-size:13px">${aud(order.subtotalCents)}</td></tr>${order.discountCents ? `<tr><td style="padding:4px 0;font-size:13px">Discount</td><td align="right" style="font-size:13px">−${aud(order.discountCents)}</td></tr>` : ""}<tr><td style="padding:4px 0;font-size:13px">Shipping</td><td align="right" style="font-size:13px">${shipping}</td></tr><tr><td style="padding:12px 0;border-top:1px solid #dedbd6;font-size:15px;font-weight:700">Total</td><td align="right" style="border-top:1px solid #dedbd6;font-size:15px;font-weight:700">${total}</td></tr></table>`,
    text: `Order ${order.id}\n${order.items.map(item => `${item.name} / ${item.size} × ${item.quantity} — ${aud(item.unitPriceCents * item.quantity)}`).join("\n")}\nSubtotal (GST inclusive): ${aud(order.subtotalCents)}${order.discountCents ? `\nDiscount: -${aud(order.discountCents)}` : ""}\nShipping: ${shipping}\nTotal: ${total}`,
  };
}

export function orderRequestEmail(order: EmailOrder, siteUrl: string): EmailDesign {
  const lines = orderLines(order);
  const intro = "We have saved your order request. No payment has been taken yet. We will confirm any outstanding shipping charge and payment details before fulfilment.";
  return { subject: `We received your IGNYTE order request · ${order.id}`, html: layout("ORDER REQUEST RECEIVED", "Thanks for your order request.", paragraph(intro) + lines.html + (order.viewUrl ? button("VIEW ORDER", order.viewUrl) : "") + paragraph("Need help? Reply to this email with your order number."), siteUrl), text: `${intro}\n\n${lines.text}${order.viewUrl ? `\nView order: ${order.viewUrl}` : ""}\n\nQuestions? support@ignyteactive.com` };
}

export function paymentConfirmedEmail(order: EmailOrder, siteUrl: string): EmailDesign {
  if (order.totalCents === null || order.shippingCents === null) throw new Error("A paid order must have a confirmed total");
  const lines = orderLines(order);
  const intro = "Your payment is confirmed. We will email you again when your order is on its way.";
  return { subject: `Your IGNYTE payment is confirmed · ${order.id}`, html: layout("PAYMENT CONFIRMED", "You're all set.", paragraph(intro) + lines.html + (order.viewUrl ? button("VIEW ORDER", order.viewUrl) : ""), siteUrl), text: `${intro}\n\n${lines.text}${order.viewUrl ? `\nView order: ${order.viewUrl}` : ""}\n\nQuestions? support@ignyteactive.com` };
}

export function orderDispatchedEmail(orderId: string, carrier: string, trackingNumber: string, siteUrl: string): EmailDesign {
  const intro = `Order ${orderId} has been dispatched with ${carrier}. Your tracking number is ${trackingNumber}. Tracking may take a little time to appear with the carrier.`;
  return { subject: `Your IGNYTE order is on its way · ${orderId}`, html: layout("ORDER DISPATCHED", "On its way.", paragraph(intro), siteUrl), text: `${intro}\n\nQuestions? support@ignyteactive.com` };
}

export function enquiryReceivedEmail(name: string, siteUrl: string): EmailDesign {
  const intro = `Hi ${name}, we received your message. The IGNYTE team will reply to this email address as soon as they can.`;
  return { subject: "We received your IGNYTE message", html: layout("MESSAGE RECEIVED", "Thanks for reaching out.", paragraph(intro), siteUrl), text: `${intro}\n\nQuestions? support@ignyteactive.com` };
}
