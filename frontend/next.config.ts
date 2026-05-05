import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      {
        source: "/chat",
        destination: "/discover",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
