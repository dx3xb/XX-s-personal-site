/** @type {import('next').NextConfig} */
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").trim();

const nextConfig = basePath
  ? {
      basePath,
      assetPrefix: basePath,
    }
  : {};

export default nextConfig;
