import os from "node:os";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

function localNetworkHostnames(): string[] {
  const hostnames = new Set<string>(["localhost", "127.0.0.1"]);
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        hostnames.add(address.address);
      }
    }
  }
  // The shared network/public address used by colleagues on this machine.
  hostnames.add("40.160.19.86");
  return [...hostnames];
}

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' is required by the theme bootstrap script and Next.js inline
  // styles. Tighten to a nonce-based policy if the theme bootstrap is replaced.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), microphone=(self), payment=()",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: localNetworkHostnames(),
  serverExternalPackages: [
    "mongoose",
    "pdfjs-dist",
    "pdf-to-img",
    "@napi-rs/canvas",
    "tesseract.js",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
