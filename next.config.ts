import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/competition", destination: "/competition.html" },
    ];
  },
};

export default nextConfig;
