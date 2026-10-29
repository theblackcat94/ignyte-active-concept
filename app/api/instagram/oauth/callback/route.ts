import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { saveInstagramToken } from "@/lib/instagram-token-store";

export const runtime = "nodejs";

function adminRedirect(request: Request, result: "connected" | "error") {
  const redirectUri = process.env.INSTAGRAM_OAUTH_REDIRECT_URI;
  const origin = redirectUri ? new URL(redirectUri).origin : new URL(request.url).origin;
  return NextResponse.redirect(new URL(`/admin/pdp-social?instagram=${result}`, origin));
}

function clearOAuthStateCookie(response: NextResponse) {
  response.cookies.set("ignyte_instagram_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/instagram/oauth/callback",
    maxAge: 0,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnedState = url.searchParams.get("state") ?? "";
  const savedState = request.headers.get("cookie")?.split(";").map(value => value.trim()).find(value => value.startsWith("ignyte_instagram_oauth_state="))?.split("=").slice(1).join("=") ?? "";
  const expectedState = savedState;
  const stateMatches = returnedState.length === expectedState.length && returnedState.length >= 32 && timingSafeEqual(Buffer.from(returnedState), Buffer.from(expectedState));
  const response = adminRedirect(request, "error");
  clearOAuthStateCookie(response);

  if (!stateMatches || url.searchParams.has("error") || !process.env.META_INSTAGRAM_APP_ID || !process.env.META_INSTAGRAM_APP_SECRET || !process.env.INSTAGRAM_OAUTH_REDIRECT_URI) return response;
  const code = url.searchParams.get("code");
  if (!code || code.length > 4096) return response;

  try {
    const form = new URLSearchParams({
      client_id: process.env.META_INSTAGRAM_APP_ID,
      client_secret: process.env.META_INSTAGRAM_APP_SECRET,
      grant_type: "authorization_code",
      redirect_uri: process.env.INSTAGRAM_OAUTH_REDIRECT_URI,
      code,
    });
    const shortResponse = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!shortResponse.ok) return response;
    const shortToken = await shortResponse.json() as { access_token?: string };
    if (!shortToken.access_token) return response;

    const exchangeUrl = new URL("https://graph.instagram.com/access_token");
    exchangeUrl.searchParams.set("grant_type", "ig_exchange_token");
    exchangeUrl.searchParams.set("client_secret", process.env.META_INSTAGRAM_APP_SECRET);
    exchangeUrl.searchParams.set("access_token", shortToken.access_token);
    const longResponse = await fetch(exchangeUrl, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!longResponse.ok) return response;
    const longToken = await longResponse.json() as { access_token?: string; expires_in?: number };
    if (!longToken.access_token || !longToken.expires_in) return response;
    await saveInstagramToken(longToken.access_token, longToken.expires_in);
    const success = adminRedirect(request, "connected");
    clearOAuthStateCookie(success);
    return success;
  } catch {
    return response;
  }
}
