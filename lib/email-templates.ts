/** Branded transactional message designs. */
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
  return `<a href="${verifiedUrl(href)}" style="display:inline-block;background:#ff4533;color:#0b1020;text-decoration:none;padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.8px">${escapeHtml(label)} &nbsp;↗</a>`;
}

function layout(eyebrow: string, title: string, content: string, siteUrl: string, preheader = "Built for the burn. Made to move with you."): string {
  const home = verifiedUrl(siteUrl);
  const logo = verifiedUrl(`${siteUrl.replace(/\/$/, "")}/images/ignyte-email-logo.png`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;background:#f5f3ee;color:#0b1020;font-family:Arial,Helvetica,sans-serif"><div style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;mso-hide:all">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff"><tr><td align="center" style="background:#0b1020;padding:12px 20px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:16px;font-weight:700;letter-spacing:2px">BUILT FOR THE BURN™</td></tr><tr><td align="center" style="padding:30px 24px 26px;background:#f8f7f4;border-bottom:4px solid #ff4533"><a href="${home}" style="text-decoration:none;color:#0b1020"><img src="${logo}" alt="IGNYTE Active" width="240" height="44" style="display:block;width:240px;max-width:100%;height:auto;border:0;color:#0b1020;font-size:24px;font-weight:700;letter-spacing:3px"></a></td></tr><tr><td style="padding:38px 32px 36px"><p style="margin:0 0 14px;color:#ff4533;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px">${escapeHtml(eyebrow)}</p><h1 style="margin:0 0 20px;color:#0b1020;font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:1.12;font-weight:700;letter-spacing:-1px">${escapeHtml(title)}</h1>${content}</td></tr><tr><td style="background:#0b1020;padding:28px 32px;color:#f8f7f4;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7"><p style="margin:0 0 10px;color:#ff4533;font-size:11px;font-weight:700;letter-spacing:2px">MOVE WITH PURPOSE. TRAIN WITH FIRE.</p><p style="margin:0;color:#f8f7f4">IGNYTE ACTIVE · BUILT FOR THE BURN™<br><a href="${home}" style="color:#f8f7f4;text-decoration:underline">Visit the store</a> &nbsp;·&nbsp; <a href="mailto:support@ignyteactive.com" style="color:#f8f7f4;text-decoration:underline">Contact support</a></p></td></tr></table></td></tr></table></body></html>`;
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

export function adminOrderEmail(order: EmailOrder, status: "awaiting payment" | "paid", customerEmail: string, siteUrl: string): EmailDesign {
  const lines = orderLines(order);
  const intro = `A customer order is ${status}. Customer: ${customerEmail}.`;
  return {
    subject: `New IGNYTE order · ${order.id} · ${status.toUpperCase()}`,
    html: layout("TEAM ORDER ALERT", `Order ${status}.`, paragraph(intro) + lines.html + button("OPEN ORDER MANAGER", `${siteUrl}/admin/orders/`), siteUrl),
    text: `${intro}\n\n${lines.text}\n\nManage orders: ${siteUrl}/admin/orders/`,
  };
}

export function orderDispatchedEmail(orderId: string, carrier: string, trackingNumber: string, siteUrl: string): EmailDesign {
  const intro = `Order ${orderId} has been dispatched with ${carrier}. Your tracking number is ${trackingNumber}. Tracking may take a little time to appear with the carrier.`;
  return { subject: `Your IGNYTE order is on its way · ${orderId}`, html: layout("ORDER DISPATCHED", "On its way.", paragraph(intro), siteUrl), text: `${intro}\n\nQuestions? support@ignyteactive.com` };
}

export function enquiryReceivedEmail(name: string, siteUrl: string): EmailDesign {
  const intro = `Hi ${name}, we received your message. The IGNYTE team will reply to this email address as soon as they can.`;
  return { subject: "We received your IGNYTE message", html: layout("MESSAGE RECEIVED", "Thanks for reaching out.", paragraph(intro), siteUrl), text: `${intro}\n\nQuestions? support@ignyteactive.com` };
}

/** Ready for the consent-based welcome flow; sending is not enabled by this template. */
export function welcomeEmail(siteUrl: string, unsubscribeUrl: string, offerCode?: string): EmailDesign {
  const home = siteUrl.replace(/\/$/, "");
  const hero = verifiedUrl(`${home}/images/about/About-bring-the-fire-3.jpg`);
  const offer = offerCode ? `<p style="margin:0 0 28px;padding:18px 20px;background:#f8f7f4;border-left:4px solid #ff4533;color:#0b1020;font-size:15px;line-height:1.5">Use code <strong style="font-size:19px;letter-spacing:2px">${escapeHtml(offerCode)}</strong> on your first order.</p>` : "";
  const offerText = offerCode ? `\nUse code ${offerCode} on your first order.\n` : "";
  const benefits = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 0;border-top:1px solid #dedbd6"><tr><td style="padding:20px 0 12px;color:#0b1020;font-size:14px;line-height:1.5"><strong>MADE FOR MOVEMENT</strong><br>Support and freedom for every rep, hold and reset.</td></tr><tr><td style="padding:12px 0;color:#0b1020;font-size:14px;line-height:1.5"><strong>TESTED IN REAL TRAINING</strong><br>Built for sweat, pressure and repeat wear.</td></tr><tr><td style="padding:12px 0 0;color:#0b1020;font-size:14px;line-height:1.5"><strong>NO DISTRACTIONS</strong><br>Considered fit so you can focus on the work.</td></tr></table>`;
  const content = `<p style="margin:0 0 24px;color:#0b1020;font-size:17px;line-height:1.5">Made for the women who bring the fire.</p><img src="${hero}" alt="IGNYTE athlete training" width="536" style="display:block;width:100%;height:auto;margin:0 0 28px;border:0"><p style="margin:0 0 20px;color:#0b1020;font-size:16px;line-height:1.6">You're on the list. Expect new drops, training notes and high-performance activewear made to move with you.</p>${offer}${button("SHOP IGNYTE", `${home}/shop/`)}${benefits}<p style="margin:30px 0 0;color:#5b5c61;font-size:12px;line-height:1.5">You can <a href="${verifiedUrl(unsubscribeUrl)}" style="color:#0b1020;text-decoration:underline">unsubscribe</a> at any time.</p>`;
  return {
    subject: "Welcome to IGNYTE. Bring your fire.",
    html: layout("WELCOME TO IGNYTE", "Bring the fire.", content, siteUrl, "You're on the list. High-performance gear for women who bring the fire."),
    text: `Welcome to IGNYTE.\n\nMade for the women who bring the fire.\n\nYou're on the list. Expect new drops, training notes and high-performance activewear made to move with you.${offerText}\nShop IGNYTE: ${home}/shop/\n\nMade for movement. Tested in real training. No distractions.\n\nUnsubscribe: ${unsubscribeUrl}`,
  };
}
