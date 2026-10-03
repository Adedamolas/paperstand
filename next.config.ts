import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi load the dev server.
  allowedDevOrigins: ["172.20.10.*", "192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
