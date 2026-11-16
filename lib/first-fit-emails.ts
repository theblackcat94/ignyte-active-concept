import { escapeHtml, layout, type EmailDesign } from "@/lib/email-templates";

export type FirstFitMailRecord = {
  customer_name: string;
  reference: string;
  product_name: string;
  current_size: string;
  requested_size: string;
};

const site = () => process.env.NEXT_PUBLIC_SITE_URL || "https://dev.ignyteactive.com";
const paragraph = (value: string) => `<p style="margin:0 0 18px;font-size:16px;line-height:1.6">${escapeHtml(value)}</p>`;
const firstName = (record: FirstFitMailRecord) => record.customer_name.trim().split(/\s+/)[0] || "there";

export function firstFitReceivedEmail(record: FirstFitMailRecord): EmailDesign {
  const body = [
    `Hi ${firstName(record)},`,
    "We've received your First Fit Promise exchange request.",
    `Return reference: ${record.reference}`,
    `Your item: ${record.product_name} / ${record.current_size}`,
    `Requested size: ${record.requested_size}`,
    "We'll review the details and email you with the next steps. Please don't send your item back until you've received our instructions.",
    "The IGNYTE Team",
  ];
  return { subject: "Let's get your IGNYTE fit right", html: layout("THE FIRST FIT PROMISE™_", "YOUR FIT MATTERS.", body.map(paragraph).join(""), site()), text: body.join("\n\n") };
}

export function firstFitApprovedEmail(record: FirstFitMailRecord, approvedInstructions: string): EmailDesign {
  const body = [
    `Hi ${firstName(record)},`,
    "Your First Fit Promise exchange has been approved. Here's how to return your original item.",
    approvedInstructions,
    `Your return reference: ${record.reference}`,
    "Once your return has been received and inspected, we'll arrange your replacement size.",
    "The IGNYTE Team",
  ];
  return { subject: "Your IGNYTE size exchange is approved", html: layout("THE FIRST FIT PROMISE™_", "LET'S MAKE IT FIT.", body.map(paragraph).join(""), site()), text: body.join("\n\n") };
}

export function firstFitDispatchedEmail(record: FirstFitMailRecord, trackingUrl: string): EmailDesign {
  const url = new URL(trackingUrl);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error("Tracking URL must be a web URL");
  const body = [
    `Hi ${firstName(record)},`,
    "Good news. Your replacement IGNYTE piece is on its way.",
    `Your new size: ${record.requested_size}`,
    `Track your delivery: ${url.toString()}`,
    "We hope this one's the perfect fit.",
    "BUILT FOR THE BURN™",
    "The IGNYTE Team",
  ];
  return { subject: "Your new IGNYTE fit is on its way 🔥", html: layout("THE FIRST FIT PROMISE™_", "ROUND TWO. BETTER FIT.", body.slice(0, 3).map(paragraph).join("") + `<p style="margin:0 0 18px"><a href="${escapeHtml(url.toString())}">TRACK YOUR DELIVERY ↗</a></p>` + body.slice(4).map(paragraph).join(""), site()), text: body.join("\n\n") };
}
