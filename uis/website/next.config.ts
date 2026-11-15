import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "127.0.0.1").split(",").map((host) => host.trim()).filter(Boolean),
};

export default nextConfig;
