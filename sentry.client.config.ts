import * as Sentry from "@sentry/nextjs"

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    // SECURITY (H7): mask all text/media so applicant PII never reaches Sentry replays.
    integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
  })
}
