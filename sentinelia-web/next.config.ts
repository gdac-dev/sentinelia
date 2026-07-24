import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);
