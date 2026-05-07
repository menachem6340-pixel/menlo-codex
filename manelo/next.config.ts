import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    workerThreads: true,
  },
  typescript: {
    // TypeScript is checked separately with `npx tsc --noEmit`.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
