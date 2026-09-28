import { describe, it, expect } from "vitest"
import { estimateCostUsd, normalizeModelId, isPricedModel } from "@/lib/ai/pricing"

describe("pricing", () => {
  it("prices Haiku 4.5 and Sonnet 4.6 per 1M tokens", () => {
    expect(estimateCostUsd("claude-haiku-4-5", 1_000_000, 0)).toBe(1)
    expect(estimateCostUsd("claude-haiku-4-5", 0, 1_000_000)).toBe(5)
    expect(estimateCostUsd("claude-sonnet-4-6", 1_000_000, 1_000_000)).toBe(18)
  })

  it("a typical mission step on Haiku costs cents, not dollars", () => {
    // 6k input + 6k output ≈ $0.036
    expect(estimateCostUsd("claude-haiku-4-5", 6000, 6000)).toBeCloseTo(0.036, 3)
  })

  it("normalises dated / prefixed ids and reports unknown models as unpriced", () => {
    expect(normalizeModelId("claude-haiku-4-5-20251001")).toBe("claude-haiku-4-5")
    expect(normalizeModelId("anthropic/claude-sonnet-4-6")).toBe("claude-sonnet-4-6")
    expect(isPricedModel("reserved")).toBe(false)
    expect(estimateCostUsd("reserved", 1000, 1000)).toBe(0)
  })
})
