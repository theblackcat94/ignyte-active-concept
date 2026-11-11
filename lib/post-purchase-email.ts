import { escapeHtml, layout, type EmailDesign } from "@/lib/email-templates";

export type JourneyStep = "fit_care" | "review_request" | "complete_set";
export type JourneyProduct = { name: string; colour: string; size: string; image: string; slug: string; care?: string };
export type JourneyRecommendation = { name: string; colour: string; image: string; slug: string; priceCents: number };
export type JourneyConfig = { step: JourneyStep; subject: string; preheader: string; body_copy: string };

const paragraph = (value: string) => `<p style="margin:0 0 18px;color:#0b1020;font-size:15px;line-height:1.6">${escapeHtml(value)}</p>`;
const heading = (value: string) => `<h2 style="margin:28px 0 12px;color:#0b1020;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.25">${escapeHtml(value)}</h2>`;
const safeImage = (value: string, site: string) => {
  const url = new URL(value, site);
  if (url.protocol !== "https:") throw new Error("Product image must be HTTPS");
  return escapeHtml(url.toString());
};
const tracked = (site: string, path: string, step: JourneyStep) => {
  const url = new URL(path, site);
  if (url.protocol !== "https:") throw new Error("Journey link must be HTTPS");
  url.searchParams.set("utm_source", "post_purchase_email");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", "post_purchase");
  url.searchParams.set("utm_content", step);
  return url.toString();
};
const cta = (label: string, url: string) => `<a href="${escapeHtml(url)}" style="display:inline-block;background:#ff4533;color:#0b1020;padding:15px 22px;font:700 13px/18px Arial,Helvetica,sans-serif;text-decoration:none">${escapeHtml(label)} ↗</a>`;
const product = (item: JourneyProduct, site: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 18px"><tr><td width="90" style="vertical-align:top"><img src="${safeImage(item.image, site)}" alt="${escapeHtml(item.name)} in ${escapeHtml(item.colour)}" width="80" style="display:block;width:80px;height:auto;border:0"></td><td style="vertical-align:top;color:#0b1020;font:15px/1.5 Arial,Helvetica,sans-serif"><strong>${escapeHtml(item.name)}</strong><br>${escapeHtml(item.colour)} / ${escapeHtml(item.size)}</td></tr></table>`;

export function postPurchaseEmail(config: JourneyConfig, products: JourneyProduct[], siteUrl: string, unsubscribeUrl: string, recommendation?: JourneyRecommendation): EmailDesign {
  const site = siteUrl.replace(/\/$/, "");
  const intro = config.body_copy.replaceAll("\\n", "\n").split(/\n\s*\n/).filter(Boolean).map(paragraph).join("");
  const sizeGuide = tracked(site, "/size-guide/", config.step);
  const contact = tracked(site, "/contact/", config.step);
  const visible = products.slice(0, config.step === "review_request" ? 2 : 3);
  let eyebrow = "MADE FOR YOUR NEXT MOVE_";
  let title = "HOW'S THE FIT?";
  let content = intro + heading("YOUR NEW IGNYTE GEAR_") + visible.map(item => product(item, site)).join("");
  let plain = config.body_copy.replaceAll("\\n", "\n") + "\n\n" + visible.map(item => `${item.name} · ${item.colour} / ${item.size}`).join("\n");

  if (config.step === "fit_care") {
    content += heading("FIND YOUR FIT_") + paragraph("Need a little guidance? Our Size Guide and Fit & Fabric information can help you find what works for the way you move.") + cta("VIEW SIZE GUIDE", sizeGuide);
    content += heading("CARE FOR YOUR GEAR_") + paragraph("Follow the care instructions on your garment label to help keep your pieces looking their best.");
    for (const item of visible.filter(value => value.care)) content += paragraph(`${item.name}: ${item.care}`);
    content += heading("NEED A HAND?_") + paragraph("Something not quite right? We're here to help with fit, sizing and product questions.") + cta("CONTACT US", contact);
    plain += `\n\nSize Guide: ${sizeGuide}\nCare: Follow the garment label.\nSupport: ${contact}`;
  } else if (config.step === "review_request") {
    eyebrow = "YOUR MOVE. YOUR VOICE_"; title = "TELL US WHAT YOU THINK.";
    content = intro + heading("HOW DID IT MOVE WITH YOU?_") + visible.map(item => product(item, site) + paragraph("How's the fit? The feel? The support? We want your honest opinion.") + cta("LEAVE A REVIEW", tracked(site, `/review/?product=${encodeURIComponent(item.slug)}`, config.step))).join("");
    content += heading("GOT A PHOTO?_") + paragraph("You can include a photo with your review. It's completely optional.") + paragraph("Thanks for being part of IGNYTE.");
    plain += "\n\n" + visible.map(item => `Review ${item.name}: ${tracked(site, `/review/?product=${encodeURIComponent(item.slug)}`, config.step)}`).join("\n");
  } else {
    if (!recommendation) throw new Error("A verified matching product is required");
    eyebrow = "PAIR IT WITH_"; title = "GOOD TOGETHER. BETTER IN MOTION.";
    const destination = tracked(site, `/product/${recommendation.slug}/`, config.step);
    content = intro + heading("YOUR IGNYTE PICK_") + product(visible[0], site) + heading("THE PERFECT PAIRING_");
    content += `<img src="${safeImage(recommendation.image, site)}" alt="${escapeHtml(recommendation.name)} in ${escapeHtml(recommendation.colour)}" width="240" style="display:block;width:240px;max-width:100%;height:auto;border:0;margin:0 0 12px">`;
    content += paragraph(`${recommendation.name} · ${recommendation.colour} · ${new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(recommendation.priceCents / 100)}`) + cta("COMPLETE YOUR SET", destination);
    plain += `\n\nMatching piece: ${recommendation.name} · ${recommendation.colour} · ${destination}`;
  }
  content += `<p style="margin:28px 0 0;color:#0b1020;font:13px/1.5 Arial,Helvetica,sans-serif">BUILT FOR THE BURN™<br>The IGNYTE Team</p>`;
  return { subject: config.subject, html: layout(eyebrow, title, content, site, config.preheader, unsubscribeUrl), text: `${title}\n\n${plain}\n\nBUILT FOR THE BURN™\nThe IGNYTE Team\n\nUnsubscribe: ${unsubscribeUrl}` };
}
