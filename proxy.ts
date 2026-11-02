import { NextResponse, type NextRequest } from "next/server";
import { auroraProductSlugs } from "@/data/aurora-product-slugs";

export function proxy(request: NextRequest) {
  const oldSlug = request.nextUrl.pathname.match(/^\/product\/([^/]+)\/?$/)?.[1];
  if (!oldSlug || !auroraProductSlugs[oldSlug]) return NextResponse.next();
  const destination = request.nextUrl.clone();
  destination.pathname = `/product/${auroraProductSlugs[oldSlug]}/`;
  return NextResponse.redirect(destination, 301);
}

export const config = {
  matcher: "/product/:slug*",
};
