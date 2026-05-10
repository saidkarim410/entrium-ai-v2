/**
 * Tests for withApiError wrapper (S-14).
 *
 * Three things must hold:
 *   1. Handler success path is untouched
 *   2. ApiError instances become a clean JSON response with the
 *      caller-supplied status/code/publicMessage
 *   3. Unknown throws become a 500 with NO stack/message in prod,
 *      but full details in dev
 */
import { describe, it, expect, beforeEach, vi } from "vitest"

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}))

const { withApiError, ApiError } = await import("@/lib/api-error")

const dummyReq = new Request("http://localhost/test")

beforeEach(() => {
  vi.unstubAllEnvs()
  vi.spyOn(console, "error").mockImplementation(() => {})
})

describe("withApiError", () => {
  it("passes through successful responses", async () => {
    const handler = withApiError(async () => Response.json({ ok: true }))
    const res = await handler(dummyReq)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })

  it("converts ApiError into clean JSON with the supplied status", async () => {
    const handler = withApiError(async () => {
      throw new ApiError({
        status: 403,
        code: "forbidden",
        message: "internal: user lacks role",
        publicMessage: "Нет доступа",
      })
    })
    const res = await handler(dummyReq)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe("forbidden")
    expect(body.message).toBe("Нет доступа")
    expect(body.message).not.toContain("internal:")
  })

  it("publicMessage defaults to message when not supplied", async () => {
    const handler = withApiError(async () => {
      throw new ApiError({ status: 400, code: "invalid", message: "Bad input" })
    })
    const body = await (await handler(dummyReq)).json()
    expect(body.message).toBe("Bad input")
  })

  it("masks unknown errors with generic message in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const handler = withApiError(async () => {
      throw new Error("Database connection refused at 10.0.0.5:5432")
    })
    const res = await handler(dummyReq)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("internal")
    expect(body.message).not.toContain("Database connection refused")
    expect(body.message).not.toContain("10.0.0.5")
    expect(body.stack).toBeUndefined()
  })

  it("surfaces full stack in development for fast debugging", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const handler = withApiError(async () => {
      throw new Error("Boom")
    })
    const res = await handler(dummyReq)
    const body = await res.json()
    expect(body.error).toBe("internal")
    expect(body.message).toBe("Boom")
    expect(body.stack).toBeTruthy()
  })

  it("calls Sentry.captureException for unknown errors", async () => {
    const Sentry = await import("@sentry/nextjs")
    const spy = vi.mocked(Sentry.captureException)
    spy.mockClear()
    const handler = withApiError(async () => {
      throw new Error("Boom")
    })
    await handler(dummyReq)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it("does NOT call Sentry for ApiError instances (they're expected)", async () => {
    const Sentry = await import("@sentry/nextjs")
    const spy = vi.mocked(Sentry.captureException)
    spy.mockClear()
    const handler = withApiError(async () => {
      throw new ApiError({ status: 401, code: "unauthorized", message: "Войди" })
    })
    await handler(dummyReq)
    expect(spy).not.toHaveBeenCalled()
  })
})
