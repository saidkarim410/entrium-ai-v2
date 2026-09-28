import { describe, it, expect } from "vitest"
import { monthLabelToLastDay, tasksFromTrackerPlan, planProgress, groupTasksByMonth, type PlanTask } from "@/lib/plan/types"

const TODAY = "2026-09-28"

describe("plan — month labels", () => {
  it("maps Russian and English month labels to the last day of the month", () => {
    expect(monthLabelToLastDay("Октябрь 2026")).toBe("2026-10-31")
    expect(monthLabelToLastDay("Февраль 2027")).toBe("2027-02-28")
    expect(monthLabelToLastDay("Май 2027")).toBe("2027-05-31")
    expect(monthLabelToLastDay("March 2027")).toBe("2027-03-31")
    expect(monthLabelToLastDay("nope")).toBeNull()
  })
})

describe("plan — tasks from a tracker plan (P1-03)", () => {
  const plan = {
    diagnosis: "d",
    score: 70,
    months: [
      {
        month: "Сентябрь 2026",
        tasks: [
          { id: "t1", title: "IELTS retake", priority: "high" as const, category: "tests", deadline: "2026-09-20" }, // past → dropped
          { id: "t2", title: "Draft SoP", priority: "medium" as const, category: "essay" },
        ],
      },
      {
        month: "Октябрь 2026",
        tasks: [{ id: "t3", title: "Bocconi early session", priority: "high" as const, category: "application", deadline: "2026-09-29" }],
      },
    ],
  }

  it("keeps own ISO deadlines as personal dates, month-end as an estimate, drops the past", () => {
    const rows = tasksFromTrackerPlan(plan, { source: "agent", sourceRunId: "run-1", todayIso: TODAY })
    expect(rows.map((r) => r.title)).toEqual(["Draft SoP", "Bocconi early session"])
    expect(rows[0]).toMatchObject({ due_date: "2026-09-30", deadline_kind: "estimate", month_label: "Сентябрь 2026", source: "agent", source_run_id: "run-1" })
    expect(rows[1]).toMatchObject({ due_date: "2026-09-29", deadline_kind: "personal", status: "todo" })
  })
})

describe("plan — progress and grouping", () => {
  const mk = (over: Partial<PlanTask>): PlanTask => ({
    id: Math.random().toString(36).slice(2),
    user_id: "u",
    title: "t",
    description: null,
    category: "prep",
    priority: "medium",
    status: "todo",
    due_date: null,
    deadline_kind: "personal",
    month_label: null,
    position: 0,
    source: "manual",
    source_run_id: null,
    application_id: null,
    scholarship_id: null,
    program_id: null,
    completed_at: null,
    created_at: "",
    updated_at: "",
    ...over,
  })

  it("counts done / overdue / next and ignores skipped", () => {
    const tasks = [
      mk({ status: "done", due_date: "2026-09-01" }),
      mk({ status: "todo", due_date: "2026-09-10" }), // overdue
      mk({ status: "todo", due_date: "2026-10-05", title: "next one" }),
      mk({ status: "skipped", due_date: "2026-10-01" }),
    ]
    const p = planProgress(tasks, TODAY)
    expect(p).toMatchObject({ total: 3, done: 1, percent: 33, overdue: 1 })
    expect(p.next?.due_date).toBe("2026-09-10")
  })

  it("groups by month label in date order, undated last", () => {
    const g = groupTasksByMonth([
      mk({ month_label: "Ноябрь 2026", due_date: "2026-11-30" }),
      mk({ month_label: "Октябрь 2026", due_date: "2026-10-31" }),
      mk({ due_date: null }),
    ])
    expect(g.map((x) => x.label)).toEqual(["Октябрь 2026", "Ноябрь 2026", "Без даты"])
  })
})
