/**
 * Tests for deadline urgency tiers (F-4 from TZ_FULLSTACK.md).
 *
 * The tier mapping drives every coloured deadline UI in the app, so a
 * silent off-by-one would tint the wrong rows critical/comfortable.
 * These tests pin the boundaries.
 */
import { describe, it, expect } from "vitest"
import { daysUntil, deadlineUrgency } from "@/lib/applications/types"

function isoDaysFromNow(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

describe("daysUntil", () => {
  it("returns null for null input", () => {
    expect(daysUntil(null)).toBeNull()
  })

  it("returns 0 for today", () => {
    expect(daysUntil(isoDaysFromNow(0))).toBe(0)
  })

  it("returns positive for future dates", () => {
    expect(daysUntil(isoDaysFromNow(7))).toBe(7)
    expect(daysUntil(isoDaysFromNow(30))).toBe(30)
  })

  it("returns negative for past dates", () => {
    expect(daysUntil(isoDaysFromNow(-5))).toBe(-5)
  })
})

describe("deadlineUrgency", () => {
  it("none for null", () => {
    expect(deadlineUrgency(null)).toBe("none")
  })

  it("overdue for past dates", () => {
    expect(deadlineUrgency(isoDaysFromNow(-1))).toBe("overdue")
    expect(deadlineUrgency(isoDaysFromNow(-100))).toBe("overdue")
  })

  it("critical for ≤3 days (boundary at 3)", () => {
    expect(deadlineUrgency(isoDaysFromNow(0))).toBe("critical")
    expect(deadlineUrgency(isoDaysFromNow(3))).toBe("critical")
  })

  it("soon for 4-7 days", () => {
    expect(deadlineUrgency(isoDaysFromNow(4))).toBe("soon")
    expect(deadlineUrgency(isoDaysFromNow(7))).toBe("soon")
  })

  it("approaching for 8-14 days", () => {
    expect(deadlineUrgency(isoDaysFromNow(8))).toBe("approaching")
    expect(deadlineUrgency(isoDaysFromNow(14))).toBe("approaching")
  })

  it("comfortable for 15-30 days", () => {
    expect(deadlineUrgency(isoDaysFromNow(15))).toBe("comfortable")
    expect(deadlineUrgency(isoDaysFromNow(30))).toBe("comfortable")
  })

  it("far for >30 days", () => {
    expect(deadlineUrgency(isoDaysFromNow(31))).toBe("far")
    expect(deadlineUrgency(isoDaysFromNow(365))).toBe("far")
  })
})
