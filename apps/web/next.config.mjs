import { withSentryConfig } from "@sentry/nextjs";
import withSerwist from "@serwist/next";
import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  compress: true,
  productionBrowserSourceMaps: false,
  outputFileTracingRoot: path.join(import.meta.dirname, "../../"),
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react", "@tanstack/react-query"],
  },
  // Transpile internal workspace packages so Turbopack resolves their deps correctly
  // Fixes "Package @prisma/client can't be external" warnings in Turbopack
  transpilePackages: ["@apps-kes/database"],
  async headers() {
    return [
      {
        source: "/api/mobile/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

const withPWA = withSerwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  disable: true,
});

export default withSentryConfig(withPWA(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  disableSourceMapUpload: !process.env.SENTRY_AUTH_TOKEN,
});
