const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function eligibleMintsoftOrder(order) {
  return order?.status === "paid" && order.stock_reserved === true &&
    order.mintsoft_order_id == null && order.shipping_details?.test_order !== true &&
    order.eway_environment !== "sandbox";
}

export function mintsoftConnectAction(orderId, siteUrl, secret) {
  if (!UUID.test(orderId) || typeof secret !== "string" || secret.length < 32 ||
      /[\r\n]/.test(secret)) throw new Error("Mintsoft callback settings are invalid");
  let url;
  try { url = new URL(siteUrl); }
  catch { throw new Error("Mintsoft callback site URL is invalid"); }
  if (url.pathname !== "/" || url.search || url.hash ||
      !["https://ignyteactive.com", "https://dev.ignyteactive.com"].includes(url.origin)) {
    throw new Error("Mintsoft callback site URL is not an Ignyte HTTPS origin");
  }
  return {
    Type: "API", SourceOrderId: orderId, Complete: false,
    ExtraCode1: `${url.origin}/api/mintsoft/shipping/dispatched`,
    ExtraCode3: `${url.origin}/api/mintsoft/shipping/delivered`,
    ExtraCode4: `Bearer ${secret}`,
  };
}

export function mintsoftOrderPayload(order, items, clientId, warehouseId, connectAction, courierService = "AUTO") {
  if (!eligibleMintsoftOrder(order) || !UUID.test(order.id) ||
      !Number.isSafeInteger(clientId) || clientId < 1 ||
      !Number.isSafeInteger(warehouseId) || warehouseId < 1 ||
      !Array.isArray(items) || items.length === 0 ||
      typeof courierService !== "string" || !courierService.trim() || courierService.length > 80) {
    throw new Error("Order is not eligible for Mintsoft export");
  }
  const shipping = order.shipping_details;
  const address = shipping?.address;
  if (!order.customer_email || !shipping?.name?.trim() || !address ||
      !address.line1?.trim() || !address.city?.trim() ||
      !address.state?.trim() || !address.postal_code?.trim() ||
      address.country !== "AU" || !Number.isSafeInteger(order.total_cents) ||
      order.total_cents < 0) {
    throw new Error(`Order ${order.id} is missing verified shipping or payment details`);
  }
  const orderItems = items.map((item) => {
    if (!item.sku?.trim() || !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
        !Number.isSafeInteger(item.unit_price_cents) || item.unit_price_cents < 0) {
      throw new Error(`Order ${order.id} has an invalid item`);
    }
    return { SKU: item.sku.trim(), Quantity: item.quantity,
      UnitPrice: item.unit_price_cents / 100 };
  });
  const names = shipping.name.trim().split(/\s+/);
  return {
    ClientId: clientId,
    WarehouseId: warehouseId,
    OrderNumber: order.id,
    ExternalOrderReference: order.id,
    FirstName: names[0],
    LastName: names.slice(1).join(" ") || names[0],
    Address1: address.line1.trim(),
    Address2: address.line2?.trim() || "",
    Town: address.city.trim(),
    County: address.state.trim(),
    PostCode: address.postal_code.trim(),
    Country: "AU",
    Email: order.customer_email.trim(),
    Phone: shipping.phone?.trim() || "",
    CourierService: courierService.trim(),
    Currency: "AUD",
    OrderValue: order.total_cents / 100,
    OrderItems: orderItems,
    ...(connectAction ? { ConnectAction: connectAction } : {}),
  };
}

export function mintsoftOrderId(value) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const raw = candidate?.OrderId ?? candidate?.orderId;
  const id = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
