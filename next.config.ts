import type { NextConfig } from "next";
import pkg from "./package.json" with { type: "json" };

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.2.99", "192.168.1.172", "100.68.2.45", "localhost"],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
  // Remotion has platform-specific native modules (compositor-*); excluding
  // from server bundle so Node resolves at runtime via require().
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/bundler",
    "@remotion/cli",
    "remotion",
  ],
};

export default nextConfig;
