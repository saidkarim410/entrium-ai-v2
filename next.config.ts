import type { NextConfig } from "next"
import path from "path"
import { withSentryConfig } from "@sentry/nextjs"

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // microphone=(self) is required by /tools/interview voice mode + Whisper
  // voice-to-text in essay editor / application notes. Camera + geo stay denied.
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
]

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    // Tree-shake the icon library + base-ui to ship only used exports
    optimizePackageImports: [
      "lucide-react",
      "@base-ui/react",
      "@base-ui/react/dialog",
      "@base-ui/react/dropdown-menu",
    ],
  },
  // Avoid leaking Vercel-specific powered-by header
  poweredByHeader: false,
  // Long-cache static assets
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
  sourcemaps: { disable: true },
})
