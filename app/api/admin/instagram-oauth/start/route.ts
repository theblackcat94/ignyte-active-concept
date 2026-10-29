import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { verifiedStaff } from "@/lib/commerce";
import { instagramOAuthReady } from "@/lib/instagram-token-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await verifiedStaff(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!instagramOAuthReady()) return NextResponse.json({ error: "Instagram connection is not configured yet. Add the Meta app settings on the server first." }, { status: 503 });

  const appId = process.env.META_INSTAGRAM_APP_ID!;
  const redirectUri = process.env.INSTAGRAM_OAUTH_REDIRECT_URI!;
  const state = randomBytes(32).toString("hex");
  const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", appId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "instagram_business_basic");
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.json({ authorizationUrl: authorizeUrl.toString() }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("ignyte_instagram_oauth_state", state, {
    httpOnly: true,
    secure: new URL(redirectUri).protocol === "https:",
    sameSite: "lax",
    path: "/api/instagram/oauth/callback",
    maxAge: 10 * 60,
  });
  return response;
}
