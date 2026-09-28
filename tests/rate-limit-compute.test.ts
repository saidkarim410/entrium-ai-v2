import { describe, it, expect } from "vitest"
import { computeRemaining, FREE_DAILY_LIMIT } from "@/lib/quota"

describe("rate-limit — computeRemaining (mirror of migration 0023)", () => {
  it("fresh free user has the full daily limit", () => {
    const s = computeRemaining({ tier: "free", proUntil: null, usedToday: 0, bonus: 0 })
    expect(s).toMatchObject({ allowed: true, remaining: FREE_DAILY_LIMIT, tier: "free", limit: FREE_DAILY_LIMIT })
  })

  it("bonus EXTENDS the allowance instead of reducing it (0029: base usage + separate bonus balance)", () => {
    const s = computeRemaining({ tier: "free", proUntil: null, usedToday: FREE_DAILY_LIMIT, bonus: 2 })
    expect(s.allowed).toBe(true)
    expect(s.remaining).toBe(0)
    expect(s.bonus).toBe(2)
    // bonus-funded calls decrement the bonus and are NOT counted in usedToday
    const lastCredit = computeRemaining({ tier: "free", proUntil: null, usedToday: FREE_DAILY_LIMIT, bonus: 1 })
    expect(lastCredit.allowed).toBe(true)
    const exhausted = computeRemaining({ tier: "free", proUntil: null, usedToday: FREE_DAILY_LIMIT, bonus: 0 })
    expect(exhausted.allowed).toBe(false)
    expect(exhausted.reason).toBe("limit_reached")
  })

  it("pro is unlimited while pro_until is in the future or null", () => {
    expect(computeRemaining({ tier: "pro", proUntil: null, usedToday: 99, bonus: 0 }).tier).toBe("pro")
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(computeRemaining({ tier: "pro", proUntil: future, usedToday: 99, bonus: 0 }).allowed).toBe(true)
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(computeRemaining({ tier: "pro", proUntil: past, usedToday: 99, bonus: 0 }).tier).toBe("free")
  })
})
