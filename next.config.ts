import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone" as const,
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  allowedDevOrigins: ['.space-z.ai'],
};

export default nextConfig;
