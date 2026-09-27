import { describe, it, expect } from "vitest"
import {
  todayIso,
  planMonths,
  parseIntakeYear,
  intakeStatusFor,
  getTemporalContext,
  temporalPromptBlock,
  datePartsInZone,
} from "@/lib/ai/temporal"
import { EMPTY_PROFILE } from "@/lib/applicant/types"

// The audit date from the CTO TZ: 28.09.2026, Tashkent (UTC+5)
const AUDIT = new Date("2026-09-27T20:30:00Z") // 01:30 on the 28th in Tashkent

describe("temporal — date parts in a timezone", () => {
  it("uses the user's timezone, not UTC", () => {
    expect(todayIso(AUDIT, "Asia/Tashkent")).toBe("2026-09-28")
    expect(todayIso(AUDIT, "UTC")).toBe("2026-09-27")
  })

  it("exposes weekday in Russian", () => {
    expect(datePartsInZone(AUDIT, "Asia/Tashkent").weekday).toBe("понедельник")
  })
})

describe("temporal — plan months", () => {
  it("starts at the current month and wraps the year", () => {
    expect(planMonths(2026, 9, 6)).toEqual([
      "Сентябрь 2026", "Октябрь 2026", "Ноябрь 2026", "Декабрь 2026", "Январь 2027", "Февраль 2027",
    ])
  })
})

describe("temporal — intake", () => {
  it("parses a 4-digit year out of free text", () => {
    expect(parseIntakeYear("2027")).toBe(2027)
    expect(parseIntakeYear("осень 2027")).toBe(2027)
    expect(parseIntakeYear("")).toBeNull()
    expect(parseIntakeYear(undefined)).toBeNull()
  })

  it("classifies past / tight / ok", () => {
    expect(intakeStatusFor(2025, 2026, 9)).toBe("past")
    expect(intakeStatusFor(2026, 2026, 9)).toBe("tight")
    expect(intakeStatusFor(2026, 2026, 1)).toBe("ok")
    expect(intakeStatusFor(2027, 2026, 9)).toBe("ok")
    expect(intakeStatusFor(null, 2026, 9)).toBe("unknown")
  })
})

describe("temporal — prompt block", () => {
  const profile = { ...EMPTY_PROFILE, goals: { year: "2027" }, academic: { graduation: "июнь 2027" } }

  it("states today with the year and the plan months, forbids earlier dates", () => {
    const ctx = getTemporalContext(profile, { now: AUDIT, timeZone: "Asia/Tashkent" })
    const block = temporalPromptBlock(ctx)
    expect(block).toContain("28 сентября 2026")
    expect(block).toContain("2026-09-28")
    expect(block).toContain("Сентябрь 2026, Октябрь 2026")
    expect(block).toContain("2027 (осенний набор 2027 — реалистичен)")
    expect(block).toContain("июнь 2027")
    expect(block).toContain("Не назначай задачи и дедлайны раньше 2026-09-28")
    expect(block).toContain("НЕ 2025")
  })

  it("flags an intake year that already passed", () => {
    const ctx = getTemporalContext({ ...profile, goals: { year: "2025" } }, { now: AUDIT })
    expect(ctx.intakeStatus).toBe("past")
    expect(temporalPromptBlock(ctx)).toContain("УЖЕ ПРОШЁЛ")
  })

  it("academic year flips in September", () => {
    expect(getTemporalContext(null, { now: AUDIT, timeZone: "Asia/Tashkent" }).academicYear).toBe("2026/2027")
    expect(getTemporalContext(null, { now: new Date("2026-05-10T10:00:00Z") }).academicYear).toBe("2025/2026")
  })
})
