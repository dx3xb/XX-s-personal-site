import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const origin = (process.env.AI_WEBSITE_BUILDER_ORIGIN ?? "").trim();
    if (!origin) return [];
    return {
      beforeFiles: [
        {
          source: "/apps/ai-website-builder/:path*",
          destination: `${origin}/apps/ai-website-builder/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
