import { describe, it, expect } from "vitest"
import { extractJsonObject, parseTracker, validateTrackerOutput } from "@/lib/agent/tracker-parse"

const TODAY = "2026-09-28"

function plan(months: unknown[]) {
  return JSON.stringify({ diagnosis: "ok", score: 70, months })
}

describe("tracker-parse — extraction", () => {
  it("strips fences and chatter", () => {
    const text = "Вот план:\n```json\n{\"a\":1}\n```\nГотово."
    expect(extractJsonObject(text)).toBe('{"a":1}')
  })

  it("returns null when there is no object", () => {
    expect(extractJsonObject("no json here")).toBeNull()
    expect(parseTracker("")).toBeNull()
  })

  it("parseTracker is tolerant (no date checks)", () => {
    const p = parseTracker(plan([{ month: "Март 2025", tasks: [] }]))
    expect(p?.months).toHaveLength(1)
  })
})

describe("tracker-parse — strict validation (P0-01 / P0-02)", () => {
  it("rejects a truncated JSON payload", () => {
    const truncated = plan([{ month: "Октябрь 2026", tasks: [{ title: "x" }] }]).slice(0, -12)
    const v = validateTrackerOutput(truncated, { todayIso: TODAY })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reason).toBe("no_json")
  })

  it("rejects a payload without months", () => {
    const v = validateTrackerOutput(JSON.stringify({ diagnosis: "", score: 1, months: [] }), { todayIso: TODAY })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reason).toBe("invalid_schema")
  })

  it("drops months from a past year and tasks with past deadlines", () => {
    const text = plan([
      { month: "Январь 2025", tasks: [{ title: "old", priority: "high", category: "tests" }] },
      {
        month: "Октябрь 2026",
        tasks: [
          { title: "past task", deadline: "2026-09-01", priority: "high", category: "tests" },
          { title: "future task", deadline: "2026-10-15", priority: "low", category: "essay" },
        ],
      },
    ])
    const v = validateTrackerOutput(text, { todayIso: TODAY })
    expect(v.ok).toBe(true)
    if (v.ok) {
      expect(v.plan.months).toHaveLength(1)
      expect(v.plan.months[0].month).toBe("Октябрь 2026")
      expect(v.plan.months[0].tasks.map((t) => t.title)).toEqual(["future task"])
      expect(v.warnings.join(" ")).toContain("Январь 2025")
      expect(v.warnings.join(" ")).toContain("Удалено задач с дедлайном в прошлом: 1")
    }
  })

  it("fails when everything is in the past", () => {
    const text = plan([{ month: "Март 2025", tasks: [{ title: "x", priority: "high", category: "tests" }] }])
    const v = validateTrackerOutput(text, { todayIso: TODAY })
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.reason).toBe("all_in_past")
  })

  it("normalises ids, priorities and categories", () => {
    const text = plan([
      { month: "Октябрь 2026", tasks: [{ title: "a", priority: "urgent", category: "" }, { title: "b" }] },
    ])
    const v = validateTrackerOutput(text, { todayIso: TODAY })
    expect(v.ok).toBe(true)
    if (v.ok) {
      expect(v.plan.months[0].tasks[0]).toMatchObject({ id: "t1", priority: "medium", category: "prep" })
      expect(v.plan.months[0].tasks[1].id).toBe("t2")
    }
  })
})
