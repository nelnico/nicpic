import type { NextConfig } from "next";

// Allow next/image to load photos served from the R2 public domain.
// Derived from R2_PUBLIC_URL (e.g. https://photos.yourdomain.com) so it stays
// in sync with your env config. Falls back to a placeholder before R2 is set up.
function r2Hostname(): string {
  try {
    return new URL(process.env.R2_PUBLIC_URL ?? "https://photos.yourdomain.com")
      .hostname;
  } catch {
    return "photos.yourdomain.com";
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "*": ["node_modules/sharp/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: r2Hostname(),
      },
    ],
  },
};

export default nextConfig;
