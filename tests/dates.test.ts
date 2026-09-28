import { describe, it, expect } from "vitest"
import { parseDateInput, parseIsoDateLocal, daysFromToday, formatIsoDate, localTodayIso } from "@/lib/dates"

describe("dates — parseDateInput (P0-04)", () => {
  it("accepts ISO and the formats people type", () => {
    expect(parseDateInput("2026-10-15")).toBe("2026-10-15")
    expect(parseDateInput("15.10.2026")).toBe("2026-10-15")
    expect(parseDateInput("15/10/2026")).toBe("2026-10-15")
    expect(parseDateInput("5.1.2027")).toBe("2027-01-05")
    expect(parseDateInput(" 15-10-2026 ")).toBe("2026-10-15")
    expect(parseDateInput("2026-10-15T00:00:00.000Z")).toBe("2026-10-15")
  })

  it("empty is empty, garbage is null", () => {
    expect(parseDateInput("")).toBe("")
    expect(parseDateInput(undefined)).toBe("")
    expect(parseDateInput("октябрь")).toBeNull()
    expect(parseDateInput("2026-13-01")).toBeNull()
    expect(parseDateInput("31.02.2026")).toBeNull()
    expect(parseDateInput("15.10.26")).toBeNull()
  })
})

describe("dates — local calendar semantics", () => {
  it("parses to local midnight, so the day never shifts with the timezone", () => {
    const d = parseIsoDateLocal("2026-10-15")!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(9)
    expect(d.getDate()).toBe(15)
    expect(d.getHours()).toBe(0)
    expect(parseIsoDateLocal("nope")).toBeNull()
  })

  it("counts whole days from a given 'now'", () => {
    const now = new Date(2026, 8, 28, 23, 59) // 28 Sep 2026, late evening local
    expect(daysFromToday("2026-10-15", now)).toBe(17)
    expect(daysFromToday("2026-09-28", now)).toBe(0)
    expect(daysFromToday("2026-09-27", now)).toBe(-1)
    expect(daysFromToday(null, now)).toBeNull()
  })

  it("formats without going through UTC", () => {
    expect(formatIsoDate("2026-10-15")).toMatch(/15/)
    expect(formatIsoDate("2026-10-15", { day: "numeric", month: "long", year: "numeric" }, "en-US")).toBe("October 15, 2026")
  })

  it("localTodayIso is YYYY-MM-DD", () => {
    expect(localTodayIso(new Date(2026, 0, 5))).toBe("2026-01-05")
  })
})
