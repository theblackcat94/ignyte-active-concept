import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  turbopack: { root: process.cwd() },
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  trailingSlash: true,
  images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [{ protocol: "https", hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, pathname: "/storage/v1/object/public/product-media/**" }]
      : [],
  },
};

export default nextConfig;
