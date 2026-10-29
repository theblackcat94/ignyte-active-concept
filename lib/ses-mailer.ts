import { createHash, createHmac } from "node:crypto";
import type { EmailDesign } from "@/lib/email-templates";

type SesMail = { to: string; message: EmailDesign };

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value).digest();

export function sesMailConfigured(): boolean {
  return Boolean(process.env.SES_AWS_ACCESS_KEY_ID && process.env.SES_AWS_SECRET_ACCESS_KEY &&
    process.env.SES_FROM_EMAIL && process.env.SES_AWS_REGION);
}

export async function sendSesMail({ to, message }: SesMail): Promise<void> {
  const accessKey = process.env.SES_AWS_ACCESS_KEY_ID;
  const secretKey = process.env.SES_AWS_SECRET_ACCESS_KEY;
  const region = process.env.SES_AWS_REGION;
  const from = process.env.SES_FROM_EMAIL;
  const sessionToken = process.env.SES_AWS_SESSION_TOKEN;
  if (!accessKey || !secretKey || !region || !from) throw new Error("SES sending is not configured");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !/^.{1,254}$/.test(from)) {
    throw new Error("SES sender or recipient address is invalid");
  }

  const host = `email.${region}.amazonaws.com`;
  const path = "/v2/email/outbound-emails";
  const body = JSON.stringify({
    FromEmailAddress: from,
    Destination: { ToAddresses: [to] },
    Content: { Simple: {
      Subject: { Data: message.subject, Charset: "UTF-8" },
      Body: { Html: { Data: message.html, Charset: "UTF-8" }, Text: { Data: message.text, Charset: "UTF-8" } },
    } },
  });
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  if (sessionToken) headers["x-amz-security-token"] = sessionToken;
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers).sort().map(key => `${key}:${headers[key].trim()}\n`).join("");
  const canonicalRequest = ["POST", path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = `${dateStamp}/${region}/ses/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const dateKey = hmac(`AWS4${secretKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "ses");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(`https://${host}${path}`, {
    method: "POST",
    headers: { ...headers, Authorization: authorization },
    body,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) {
    // Keep AWS error bodies out of logs; they can contain message metadata.
    throw new Error(`SES rejected the message (${response.status})`);
  }
}
