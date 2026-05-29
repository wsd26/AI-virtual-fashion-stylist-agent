import type { NextConfig } from "next";

const isStaticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : undefined,
  basePath: isStaticExport ? "/AI-virtual-fashion-stylist-agent" : "",
  images: {
    unoptimized: isStaticExport,
  },
};

export default nextConfig;
