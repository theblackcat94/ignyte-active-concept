import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const destination = request.nextUrl.clone();
  destination.pathname = "/product/seamless-short-aurora/";
  return NextResponse.redirect(destination, 301);
}

export const config = {
  matcher: ["/product/seamless-short-jacaranda", "/product/seamless-short-jacaranda/"],
};
