import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  turbopack: { root: process.cwd() },
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  trailingSlash: true,
};

export default nextConfig;
