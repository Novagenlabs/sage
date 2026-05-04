import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Resource covers and narration audio are written once and named by
  // resource id, so they're effectively immutable. Long max-age + immutable
  // tells Cloudflare and the browser to cache forever, so the origin only
  // pays bandwidth for the first request from each edge POP.
  async headers() {
    return [
      {
        source: "/resource-covers/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/resource-audio/:file*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
