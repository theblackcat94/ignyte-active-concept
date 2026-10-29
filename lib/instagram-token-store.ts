import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type StoredToken = { accessToken: string; expiresAt: number; refreshedAt: number };

const stateDir = process.env.IGNYTE_STATE_DIR ?? (process.env.NODE_ENV === "production" ? "/var/lib/ignyte" : path.join(process.cwd(), ".local-data"));
const tokenPath = path.join(stateDir, "instagram-token.json");

export function instagramOAuthReady() {
  return Boolean(process.env.META_INSTAGRAM_APP_ID && process.env.META_INSTAGRAM_APP_SECRET && process.env.INSTAGRAM_OAUTH_REDIRECT_URI);
}

async function readStoredToken(): Promise<StoredToken | null> {
  try {
    const data = JSON.parse(await readFile(tokenPath, "utf8")) as Partial<StoredToken>;
    if (typeof data.accessToken !== "string" || !data.accessToken || typeof data.expiresAt !== "number") return null;
    return { accessToken: data.accessToken, expiresAt: data.expiresAt, refreshedAt: typeof data.refreshedAt === "number" ? data.refreshedAt : 0 };
  } catch { return null; }
}

export async function saveInstagramToken(accessToken: string, expiresIn: number) {
  await mkdir(stateDir, { recursive: true, mode: 0o750 });
  const now = Date.now();
  const token: StoredToken = { accessToken, expiresAt: now + expiresIn * 1000, refreshedAt: now };
  const temporary = `${tokenPath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(token)}\n`, { mode: 0o600 });
  await rename(temporary, tokenPath);
  return token;
}

export async function instagramConnected() {
  return Boolean(process.env.IGNYTE_INSTAGRAM_ACCESS_TOKEN || await readStoredToken());
}

export async function getInstagramAccessToken() {
  const token = await readStoredToken();
  if (!token) return process.env.IGNYTE_INSTAGRAM_ACCESS_TOKEN ?? null;
  if (token.expiresAt <= Date.now()) return null;

  // Long-lived Instagram tokens should be refreshed before their 60-day expiry.
  if (token.expiresAt - Date.now() <= 14 * 24 * 60 * 60 * 1000 && token.refreshedAt < Date.now() - 24 * 60 * 60 * 1000) {
    const refreshUrl = new URL("https://graph.instagram.com/refresh_access_token");
    refreshUrl.searchParams.set("grant_type", "ig_refresh_token");
    refreshUrl.searchParams.set("access_token", token.accessToken);
    const response = await fetch(refreshUrl, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const result = await response.json() as { access_token?: string; expires_in?: number };
      if (result.access_token && result.expires_in) return (await saveInstagramToken(result.access_token, result.expires_in)).accessToken;
    }
  }
  return token.accessToken;
}
