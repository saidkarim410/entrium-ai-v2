import { describe, it, expect } from "vitest"
import { suggestNextStep } from "@/lib/reminders/next-step"
import type { Application } from "@/lib/applications/types"

function app(partial: Partial<Application>): Application {
  return {
    id: "id",
    user_id: "u",
    university_name: "MIT",
    university_country: null,
    program: null,
    level: null,
    round: null,
    deadline: null,
    status: "planning",
    priority: "match",
    application_fee_usd: null,
    notes: null,
    checklist: [],
    result_decision: null,
    ai_suggestions: null,
    ai_suggestions_at: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...partial,
  }
}

/** ISO date `days` from today (date-only). */
function iso(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

describe("suggestNextStep", () => {
  it("nudges to fill profile when onboarding incomplete", () => {
    const r = suggestNextStep({ apps: [], completed: false })
    expect(r.text).toContain("профиль")
    expect(r.href).toContain("/onboarding")
  })

  it("nudges to add a university when none active", () => {
    const r = suggestNextStep({ apps: [], completed: true })
    expect(r.text).toContain("первый вуз")
    expect(r.href).toContain("/applications")
  })

  it("ignores non-active statuses when deciding to start a list", () => {
    const r = suggestNextStep({
      apps: [app({ status: "rejected", deadline: iso(3) })],
      completed: true,
    })
    expect(r.text).toContain("первый вуз")
  })

  it("prioritizes the nearest near-term deadline → Reviewer", () => {
    const r = suggestNextStep({
      apps: [
        app({ university_name: "Stanford", deadline: iso(5), status: "in_progress" }),
        app({ university_name: "MIT", deadline: iso(40), status: "in_progress" }),
      ],
      completed: true,
    })
    expect(r.text).toContain("Stanford")
    expect(r.href).toContain("/tools/reviewer")
  })

  it("asks to set a deadline when an active app has none", () => {
    const r = suggestNextStep({
      apps: [app({ university_name: "Yale", deadline: null, status: "in_progress" })],
      completed: true,
    })
    expect(r.text).toContain("дедлайн")
    expect(r.text).toContain("Yale")
  })

  it("suggests broadening the list when fewer than 3 apps with far deadlines", () => {
    const r = suggestNextStep({
      apps: [app({ university_name: "MIT", deadline: iso(90), status: "planning" })],
      completed: true,
    })
    expect(r.href).toContain("/agent")
  })

  it("keeps momentum with 3+ apps and far deadlines", () => {
    const r = suggestNextStep({
      apps: [
        app({ university_name: "A", deadline: iso(60), status: "in_progress" }),
        app({ university_name: "B", deadline: iso(70), status: "in_progress" }),
        app({ university_name: "C", deadline: iso(80), status: "in_progress" }),
      ],
      completed: true,
    })
    expect(r.href).toContain("/tools/reviewer")
  })
})
