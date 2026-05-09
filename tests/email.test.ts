import { describe, it, expect, beforeAll } from "vitest"

// EMAIL_TOKEN_SECRET is required by signToken — set a deterministic one for tests
beforeAll(() => {
  process.env.EMAIL_TOKEN_SECRET = "test-secret-fixed-value-do-not-use-in-prod"
})

describe("HMAC token sign/verify", () => {
  // Late import so env is set first
  it("signs and verifies a round-trip", async () => {
    const { signToken, verifyToken } = await import("@/lib/email")
    const token = signToken("user-123", "unsubscribe")
    expect(token).toBeTruthy()
    expect(token.split(".")).toHaveLength(3)
    const verified = verifyToken(token, "unsubscribe")
    expect(verified).toBe("user-123")
  })

  it("rejects token with wrong action", async () => {
    const { signToken, verifyToken } = await import("@/lib/email")
    const token = signToken("user-123", "unsubscribe")
    expect(verifyToken(token, "delete-account")).toBeNull()
  })

  it("rejects tampered userId", async () => {
    const { signToken, verifyToken } = await import("@/lib/email")
    const token = signToken("user-123", "unsubscribe")
    const [, action, sig] = token.split(".")
    const tampered = `attacker-id.${action}.${sig}`
    expect(verifyToken(tampered, "unsubscribe")).toBeNull()
  })

  it("rejects tampered signature", async () => {
    const { signToken, verifyToken } = await import("@/lib/email")
    const token = signToken("user-123", "unsubscribe")
    const [userId, action] = token.split(".")
    const tampered = `${userId}.${action}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`
    expect(verifyToken(tampered, "unsubscribe")).toBeNull()
  })

  it("rejects malformed token", async () => {
    const { verifyToken } = await import("@/lib/email")
    expect(verifyToken("", "unsubscribe")).toBeNull()
    expect(verifyToken("only-one-part", "unsubscribe")).toBeNull()
    expect(verifyToken("two.parts", "unsubscribe")).toBeNull()
  })
})
