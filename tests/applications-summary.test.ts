/**
 * Tests for application list helpers (Q-2 expansion from TZ_FULLSTACK.md).
 *
 * summarizeApplications + applicationsToContextBlock are pure functions
 * fed by the dashboard widget and AI prompts. A wrong count or a missed
 * sort order would silently degrade the daily summary and AI suggestions.
 */
import { describe, it, expect } from "vitest"
import {
  summarizeApplications,
  applicationsToContextBlock,
  type Application,
} from "@/lib/applications/types"

function app(partial: Partial<Application>): Application {
  return {
    id: "id-" + Math.random().toString(36).slice(2, 8),
    user_id: "user-1",
    university_name: "Test University",
    university_country: "USA",
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
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  }
}

describe("summarizeApplications", () => {
  it("counts an empty list as all zeros", () => {
    const s = summarizeApplications([])
    expect(s.total).toBe(0)
    expect(s.submitted).toBe(0)
    expect(s.accepted).toBe(0)
    expect(s.nextDeadline).toBeNull()
  })

  it("counts statuses correctly (submitted bucket = anything past planning/withdrew)", () => {
    const apps = [
      app({ status: "planning" }),
      app({ status: "submitted" }),
      app({ status: "submitted" }),
      app({ status: "accepted" }),
      app({ status: "rejected" }),
      app({ status: "withdrew" }), // not in submitted bucket
    ]
    const s = summarizeApplications(apps)
    expect(s.total).toBe(6)
    // submitted bucket counts anything that's been actually sent off:
    // submitted, interview, accepted, rejected, waitlisted, deferred (not planning/withdrew)
    expect(s.submitted).toBe(4)
    expect(s.accepted).toBe(1)
  })

  it("picks the earliest future deadline", () => {
    const future1 = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
    const future2 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
    const past = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10)

    const s = summarizeApplications([
      app({ deadline: future2 }),
      app({ deadline: past }),
      app({ deadline: future1 }),
    ])
    expect(s.nextDeadline).toBe(future1)
  })

  it("ignores past deadlines for nextDeadline", () => {
    const past = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10)
    const s = summarizeApplications([app({ deadline: past })])
    expect(s.nextDeadline).toBeNull()
  })
})

describe("applicationsToContextBlock", () => {
  it("returns empty string for empty list", () => {
    expect(applicationsToContextBlock([])).toBe("")
  })

  it("includes university name + program + status + priority", () => {
    const block = applicationsToContextBlock([
      app({ university_name: "MIT", university_country: "USA", program: "CS", status: "submitted", priority: "reach" }),
    ])
    expect(block).toContain("MIT")
    expect(block).toContain("CS")
    // Country is not part of the prompt block (kept terse for token budget)
    // but status + priority labels are
    expect(block.toLowerCase()).toContain("подано") // STATUS_LABELS.submitted
    expect(block).toContain("Reach") // PRIORITY_LABELS.reach
  })

  it("formats multiple apps as separate lines", () => {
    const block = applicationsToContextBlock([
      app({ university_name: "MIT" }),
      app({ university_name: "Stanford" }),
    ])
    const lines = block.split("\n").filter(Boolean)
    expect(lines.length).toBeGreaterThanOrEqual(2)
    expect(block).toContain("MIT")
    expect(block).toContain("Stanford")
  })
})
