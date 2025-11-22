import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/card-matching",
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default nextConfig;
