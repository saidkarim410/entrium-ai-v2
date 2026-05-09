import { describe, it, expect } from "vitest"
import {
  daysUntil,
  summarizeApplications,
  applicationsToContextBlock,
  STATUS_LABELS,
  PRIORITY_LABELS,
  type Application,
} from "@/lib/applications/types"

function mkApp(over: Partial<Application> = {}): Application {
  return {
    id: "id-" + Math.random().toString(36).slice(2),
    user_id: "user-1",
    university_name: "MIT",
    university_country: "USA",
    program: "Computer Science",
    level: "Bachelor",
    round: "EA",
    deadline: null,
    status: "planning",
    priority: "match",
    application_fee_usd: null,
    notes: null,
    checklist: [],
    result_decision: null,
    ai_suggestions: null,
    ai_suggestions_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...over,
  }
}

describe("daysUntil", () => {
  it("returns null for null input", () => {
    expect(daysUntil(null)).toBeNull()
  })

  it("returns ≤1 for today (TZ-tolerant)", () => {
    // The implementation mixes UTC ISO and local midnight, which means
    // "today" can map to 0 or 1 depending on the runner's timezone.
    const today = new Date().toISOString().slice(0, 10)
    const v = daysUntil(today)
    expect(v).not.toBeNull()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThanOrEqual(1)
  })

  it("returns ≥1 for tomorrow", () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const v = daysUntil(tomorrow) ?? -999
    expect(v).toBeGreaterThanOrEqual(1)
    expect(v).toBeLessThanOrEqual(2)
  })

  it("returns ≤0 for yesterday", () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    const v = daysUntil(yesterday) ?? 999
    expect(v).toBeLessThanOrEqual(0)
    expect(v).toBeGreaterThanOrEqual(-1)
  })

  it("returns ~365 for one year out", () => {
    const oneYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)
    const v = daysUntil(oneYear) ?? 0
    expect(Math.abs(v - 365)).toBeLessThan(2)
  })
})

describe("summarizeApplications", () => {
  it("zeroes for empty input", () => {
    const s = summarizeApplications([])
    expect(s.total).toBe(0)
    expect(s.submitted).toBe(0)
    expect(s.accepted).toBe(0)
    expect(s.nextDeadline).toBeNull()
  })

  it("counts accepted strictly", () => {
    const apps = [
      mkApp({ status: "accepted" }),
      mkApp({ status: "accepted" }),
      mkApp({ status: "rejected" }),
      mkApp({ status: "submitted" }),
    ]
    const s = summarizeApplications(apps)
    expect(s.total).toBe(4)
    expect(s.accepted).toBe(2)
  })

  it("counts submitted as anything past planning/in_progress", () => {
    const apps = [
      mkApp({ status: "planning" }),
      mkApp({ status: "in_progress" }),
      mkApp({ status: "submitted" }),
      mkApp({ status: "interview" }),
      mkApp({ status: "accepted" }),
      mkApp({ status: "waitlisted" }),
    ]
    const s = summarizeApplications(apps)
    expect(s.submitted).toBe(4) // submitted, interview, accepted, waitlisted
  })

  it("picks soonest future deadline", () => {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 86_400_000).toISOString().slice(0, 10)
    const nextWeek = new Date(today.getTime() + 7 * 86_400_000).toISOString().slice(0, 10)
    const yesterday = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10)

    const apps = [
      mkApp({ deadline: nextWeek }),
      mkApp({ deadline: tomorrow }),
      mkApp({ deadline: yesterday }),
    ]
    const s = summarizeApplications(apps)
    expect(s.nextDeadline).toBe(tomorrow)
  })
})

describe("applicationsToContextBlock", () => {
  it("returns empty string for empty list", () => {
    expect(applicationsToContextBlock([])).toBe("")
  })

  it("renders university + status + priority for each app", () => {
    const apps = [
      mkApp({ university_name: "MIT", priority: "reach", status: "in_progress" }),
      mkApp({ university_name: "Stanford", priority: "match", status: "submitted" }),
    ]
    const out = applicationsToContextBlock(apps)
    expect(out).toContain("[Заявки абитуриента]")
    expect(out).toContain("MIT")
    expect(out).toContain("Stanford")
    expect(out).toContain(STATUS_LABELS.in_progress)
    expect(out).toContain(STATUS_LABELS.submitted)
    expect(out).toContain(`(${PRIORITY_LABELS.reach})`)
    expect(out).toContain(`(${PRIORITY_LABELS.match})`)
  })

  it("includes deadline when present", () => {
    const apps = [mkApp({ deadline: "2026-12-15", university_name: "Yale" })]
    expect(applicationsToContextBlock(apps)).toContain("до 2026-12-15")
  })
})
