import "server-only";

type EwayEnvironment = "sandbox" | "production";

type EwayConfig = {
  environment: EwayEnvironment;
  apiKey: string;
  apiPassword: string;
  apiBase: string;
};

export type EwaySharedPageRequest = {
  orderId: string;
  totalCents: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  redirectUrl: string;
  cancelUrl: string;
};

export type EwaySharedPage = { accessCode: string; url: string };

export type EwayTransaction = {
  transactionId: string;
  paid: boolean;
  totalCents: number;
  invoiceReference: string;
  currencyCode: string;
  responseCode: string;
};

function config(): EwayConfig {
  const environment = process.env.EWAY_ENVIRONMENT;
  const apiKey = process.env.EWAY_API_KEY;
  const apiPassword = process.env.EWAY_API_PASSWORD;
  if ((environment !== "sandbox" && environment !== "production") || !apiKey || !apiPassword) {
    throw new Error("Eway payment settings are unavailable");
  }
  return {
    environment,
    apiKey,
    apiPassword,
    apiBase: environment === "sandbox"
      ? "https://api.sandbox.ewaypayments.com"
      : "https://api.ewaypayments.com",
  };
}

export function ewayConfigured() {
  try { config(); return true; } catch { return false; }
}

export function ewayEnvironment(): EwayEnvironment | null {
  try { return config().environment; } catch { return null; }
}

async function request(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const settings = config();
  const credential = Buffer.from(`${settings.apiKey}:${settings.apiPassword}`).toString("base64");
  const response = await fetch(`${settings.apiBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credential}`,
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(`Eway request failed (${response.status})`);
  }
  return body as Record<string, unknown>;
}

export async function createEwaySharedPage(input: EwaySharedPageRequest): Promise<EwaySharedPage> {
  if (!Number.isSafeInteger(input.totalCents) || input.totalCents <= 0 || input.totalCents > 9999999999) {
    throw new Error("Invalid payment amount");
  }
  const [firstName, ...lastName] = input.customerName.trim().split(/\s+/);
  const body = await request("/AccessCodesShared", {
    method: "POST",
    body: JSON.stringify({
      Method: "ProcessPayment",
      TransactionType: "Purchase",
      RedirectUrl: input.redirectUrl,
      CancelUrl: input.cancelUrl,
      CustomerReadOnly: true,
      Customer: {
        FirstName: firstName || "Customer",
        LastName: lastName.join(" ") || "Ignyte",
        Email: input.customerEmail,
        Phone: input.customerPhone,
      },
      Payment: {
        TotalAmount: input.totalCents,
        InvoiceReference: input.orderId,
        InvoiceDescription: "Ignyte Active order",
        CurrencyCode: "AUD",
      },
    }),
  });
  const accessCode = body.AccessCode;
  const sharedUrl = body.SharedPaymentUrl;
  if (body.Errors || typeof accessCode !== "string" || !accessCode || typeof sharedUrl !== "string") {
    throw new Error("Eway did not create a payment page");
  }
  const url = new URL(sharedUrl);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".ewaypayments.com")) {
    throw new Error("Eway returned an unexpected payment URL");
  }
  return { accessCode, url: sharedUrl };
}

export async function getEwayTransaction(accessCode: string): Promise<EwayTransaction> {
  if (!accessCode || accessCode.length > 512) throw new Error("Invalid payment reference");
  const body = await request(`/Transaction/${encodeURIComponent(accessCode)}`);
  const rows = body.Transactions;
  const result = Array.isArray(rows) ? rows[0] : body;
  if (!result || typeof result !== "object") throw new Error("Eway returned no transaction");
  const transaction = result as Record<string, unknown>;
  const payment = transaction.Payment;
  const details = payment && typeof payment === "object" ? payment as Record<string, unknown> : transaction;
  const transactionId = transaction.TransactionID;
  const totalCents = details.TotalAmount;
  const invoiceReference = details.InvoiceReference;
  const currencyCode = details.CurrencyCode;
  const status = transaction.TransactionStatus;
  const responseCode = transaction.ResponseCode;
  if ((typeof transactionId !== "number" && typeof transactionId !== "string") ||
      typeof totalCents !== "number" || typeof invoiceReference !== "string" ||
      typeof currencyCode !== "string" || typeof status !== "boolean" ||
      typeof responseCode !== "string") {
    throw new Error("Eway returned incomplete transaction details");
  }
  return {
    transactionId: String(transactionId),
    paid: status && responseCode === "00",
    totalCents,
    invoiceReference,
    currencyCode,
    responseCode,
  };
}
