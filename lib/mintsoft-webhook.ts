import { z } from "zod";

type ShippingEvent = {
  orderId: string;
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function textField(row: Record<string, unknown>, names: string[], max: number): string | null {
  for (const name of names) {
    const value = row[name];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, max);
  }
  return null;
}

export function parseMintsoftShippingEvent(value: unknown): ShippingEvent | null {
  const wrapper = record(value);
  if (!wrapper) return null;
  // The despatch callback is the order JSON; delivered callbacks may wrap it.
  const order = record(wrapper.Order) ?? wrapper;
  const source = textField(order, ["SourceOrderId", "OrderNumber", "ExternalOrderReference"], 100);
  if (!source || !z.uuid().safeParse(source).success) return null;
  const carrier = textField(order, ["CourierServiceName", "CourierService", "CourierName", "Courier"], 120);
  const trackingNumber = textField(order, ["TrackingNumber", "TrackingNo", "TrackingID"], 120);
  const rawUrl = textField(order, ["TrackingURL", "TrackingUrl", "TrackingLink"], 2048);
  let trackingUrl: string | null = null;
  if (rawUrl) {
    try {
      const formatted = rawUrl.includes("{0}")
        ? trackingNumber ? rawUrl.replaceAll("{0}", encodeURIComponent(trackingNumber)) : ""
        : rawUrl;
      const url = new URL(formatted);
      if (url.protocol === "https:") trackingUrl = url.toString();
    } catch { /* Mintsoft may return an unavailable or relative courier link. */ }
  } else if (trackingNumber && ([2058, 2057].includes(Number(order.CourierServiceId)) ||
      carrier === "AusPost" || carrier === "3J55 - EXPRESS POST")) {
    trackingUrl = `https://auspost.com.au/mypost/track/#/details/${encodeURIComponent(trackingNumber)}`;
  }
  return {
    orderId: source,
    carrier,
    trackingNumber,
    trackingUrl,
  };
}
