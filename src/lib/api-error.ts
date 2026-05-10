import * as Sentry from "@sentry/nextjs"

/**
 * Global API error handler (S-14 from TZ_FULLSTACK.md).
 *
 * Wraps a Next.js route handler so any uncaught throw is converted
 * into a clean `{ error, message }` JSON response with no stack
 * trace leakage in production. The full error is reported to Sentry
 * with breadcrumbs intact.
 *
 * Usage in a route:
 *
 *   export const POST = withApiError(async (req: Request) => {
 *     // ...your handler...
 *     return Response.json({ ok: true })
 *   })
 *
 * In dev (`NODE_ENV !== 'production'`) the response includes the
 * error message + stack so debugging is fast. In prod, only a
 * generic "internal" string goes to the client; details to Sentry.
 */

export type ApiHandler = (req: Request, ctx?: unknown) => Promise<Response>

/**
 * Sentinel for handlers that want to return a specific HTTP error
 * with a user-facing message without throwing a 500. Throw an
 * `ApiError` rather than letting a generic Error escape.
 */
export class ApiError extends Error {
  status: number
  code: string
  /** User-safe message that's OK to show in the browser */
  publicMessage: string

  constructor(opts: { status: number; code: string; message: string; publicMessage?: string }) {
    super(opts.message)
    this.name = "ApiError"
    this.status = opts.status
    this.code = opts.code
    this.publicMessage = opts.publicMessage ?? opts.message
  }
}

const isProd = () => process.env.NODE_ENV === "production"

export function withApiError(handler: ApiHandler): ApiHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      // Known, user-safe errors — pass through cleanly
      if (err instanceof ApiError) {
        return Response.json(
          { error: err.code, message: err.publicMessage },
          { status: err.status },
        )
      }

      // Unknown error — log full detail, return scrubbed response
      Sentry.captureException(err, { tags: { layer: "api" } })

      const message = err instanceof Error ? err.message : String(err)
      const stack = err instanceof Error ? err.stack : undefined

      // Visible in server logs always — helps when Sentry isn't configured
      console.error("[withApiError] uncaught:", message, stack)

      if (isProd()) {
        return Response.json(
          {
            error: "internal",
            message: "Что-то пошло не так. Попробуй ещё раз через минуту.",
          },
          { status: 500 },
        )
      }

      // Dev: surface stack to help debugging
      return Response.json(
        { error: "internal", message, stack },
        { status: 500 },
      )
    }
  }
}
