import type { NextConfig } from "next"
import path from "path"
import { withSentryConfig } from "@sentry/nextjs"

// Content Security Policy — closes S-6 from TZ_FULLSTACK.md.
// We allow:
//   - script-src: own + Vercel + PostHog + Stripe (for Pro upgrade) + Sentry tunnel
//   - 'unsafe-inline' for scripts is required by Next.js for inlined hydration data
//     (will revisit once nonce-based CSP is wired up)
//   - connect-src: Supabase realtime, OpenAI/Anthropic streaming, Sentry, PostHog
//   - frame-src: Stripe Checkout
//   - img/media: data: + https: for AI-generated and externally hosted images
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel.app https://*.posthog.com https://*.i.posthog.com https://js.stripe.com https://*.sentry.io https://telegram.org https://*.telegram.org",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://api.anthropic.com https://*.posthog.com https://*.i.posthog.com https://*.sentry.io https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "worker-src 'self' blob:",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ")

// Permissions-Policy — closes S-12 from TZ_FULLSTACK.md
// microphone=(self) is required by /tools/interview voice mode + Whisper
// voice-to-text in essay editor / application notes.
// payment=(self "https://js.stripe.com") allows the Stripe iframe to handle PMs.
const permissionsPolicy = [
  "camera=()",
  "microphone=(self)",
  "geolocation=()",
  "payment=(self \"https://js.stripe.com\")",
  "interest-cohort=()",
  "browsing-topics=()",
  "usb=()",
  "magnetometer=()",
  "accelerometer=()",
  "gyroscope=()",
].join(", ")

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: permissionsPolicy },
  { key: "Content-Security-Policy", value: csp },
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
  // Q-5 (TZ): enable Sentry source-maps in production builds only.
  // Was disabled everywhere — stack traces in Sentry showed minified
  // names like `ay`, `oJ`, `iu`, making prod debugging painful (we hit
  // this exact problem during the onboarding crash investigation).
  // CI sets SENTRY_AUTH_TOKEN; local dev skips upload silently.
  sourcemaps: {
    disable: process.env.NODE_ENV !== "production",
    deleteSourcemapsAfterUpload: true,
  },
})
