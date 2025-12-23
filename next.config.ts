import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const origin = process.env.AI_WEBSITE_BUILDER_ORIGIN;
    if (!origin) return [];
    return {
      beforeFiles: [
        {
          source: "/apps/ai-website-builder/:path*",
          destination: `${origin}/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
