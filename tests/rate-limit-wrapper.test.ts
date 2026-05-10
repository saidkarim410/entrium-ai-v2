/**
 * Tests for rate-limit.ts wrapper (Q-7 expansion).
 *
 * The TS layer is thin but its error handling matters: when the
 * underlying RPC throws (e.g. ambiguous column reference, network),
 * we MUST return `{allowed: false, reason: 'limit_reached'}` rather
 * than letting the exception bubble — otherwise users see a hard
 * crash instead of a clean "limit reached" message.
 *
 * This file mocks supabaseAdmin.rpc and exercises every branch of
 * checkUsage / consumeBonus / recordUsage.
 */
import { describe, it, expect, beforeEach, vi } from "vitest"

const rpcMock = vi.fn()
const insertMock = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    rpc: rpcMock,
    from: () => ({
      insert: insertMock,
    }),
  },
}))

const { checkUsage, consumeBonus, recordUsage } = await import("@/lib/rate-limit")

beforeEach(() => {
  rpcMock.mockReset()
  insertMock.mockReset()
  insertMock.mockResolvedValue({ data: null, error: null })
})

describe("checkUsage", () => {
  it("returns allowed=true for Pro tier sentinel", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: true, remaining: 2_147_483_647, tier: "pro", bonus: 0 }],
      error: null,
    })
    const r = await checkUsage("user-1")
    expect(r.allowed).toBe(true)
    expect(r.tier).toBe("pro")
    expect(r.reason).toBeUndefined()
  })

  it("returns allowed=true for free tier with quota", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: true, remaining: 4, tier: "free", bonus: 0 }],
      error: null,
    })
    const r = await checkUsage("user-1")
    expect(r.allowed).toBe(true)
    expect(r.tier).toBe("free")
    expect(r.remaining).toBe(4)
    expect(r.reason).toBeUndefined()
  })

  it("returns allowed=false with reason='limit_reached' when free quota exhausted", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: false, remaining: 0, tier: "free", bonus: 0 }],
      error: null,
    })
    const r = await checkUsage("user-1")
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe("limit_reached")
    expect(r.remaining).toBe(0)
  })

  it("falls back to limit_reached when RPC throws (ambiguous column reproduction)", async () => {
    // This is the regression test for the 0016/0017 bug — RPC errored
    // on every call and the wrapper must NOT propagate the throw.
    rpcMock.mockResolvedValueOnce({
      data: null,
      error: { message: 'column reference "tier" is ambiguous' },
    })
    const r = await checkUsage("user-1")
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe("limit_reached")
    expect(r.tier).toBe("free")
    expect(r.bonus).toBe(0)
  })

  it("falls back to limit_reached when RPC returns empty array", async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null })
    const r = await checkUsage("user-1")
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe("limit_reached")
  })

  it("handles single-object RPC response (not array)", async () => {
    // Some Postgrest setups unwrap single-row results
    rpcMock.mockResolvedValueOnce({
      data: { allowed: true, remaining: 5, tier: "free", bonus: 0 },
      error: null,
    })
    const r = await checkUsage("user-1")
    expect(r.allowed).toBe(true)
  })

  it("reflects bonus credits in the result", async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{ allowed: true, remaining: 8, tier: "free", bonus: 3 }],
      error: null,
    })
    const r = await checkUsage("user-1")
    expect(r.bonus).toBe(3)
    expect(r.remaining).toBe(8)
  })
})

describe("consumeBonus", () => {
  it("returns the new balance from the atomic decrement", async () => {
    rpcMock.mockResolvedValueOnce({ data: 2, error: null })
    const r = await consumeBonus("user-1")
    expect(r).toBe(2)
  })

  it("returns null when there is no bonus to consume", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null })
    const r = await consumeBonus("user-1")
    expect(r).toBeNull()
  })

  it("returns null on RPC error rather than throwing", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: "boom" } })
    const r = await consumeBonus("user-1")
    expect(r).toBeNull()
  })
})

describe("recordUsage", () => {
  it("inserts one row with all fields populated", async () => {
    await recordUsage({
      userId: "u1",
      tool: "reviewer",
      model: "haiku",
      inputTokens: 123,
      outputTokens: 456,
      costUsd: 0.0042,
    })
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "u1",
      tool: "reviewer",
      model: "haiku",
      input_tokens: 123,
      output_tokens: 456,
      cost_usd: 0.0042,
    })
  })
})
