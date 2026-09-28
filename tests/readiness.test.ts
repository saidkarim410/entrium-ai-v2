import { describe, it, expect } from "vitest"
import { applicationReadiness } from "@/lib/applicant/readiness"
import { EMPTY_PROFILE } from "@/lib/applicant/types"

describe("application readiness (P1-05)", () => {
  it("empty profile → 0 of 6 with every item listed", () => {
    const r = applicationReadiness({ profile: EMPTY_PROFILE, applicationsCount: 0, planTasksCount: 0 })
    expect(r.score).toBe(0)
    expect(r.missing).toHaveLength(6)
  })

  it("is independent from profile completeness: a full profile without applications is not ready", () => {
    const r = applicationReadiness({
      profile: {
        ...EMPTY_PROFILE,
        academic: { schoolYears: "11", graduation: "июнь 2027", ielts: "7.0" },
        goals: { level: "Bachelor", major: "Economics", countries: "Италия", budget: "10000", fundingNeed: "full" },
      },
      applicationsCount: 0,
      planTasksCount: 0,
    })
    expect(r.score).toBe(4)
    expect(r.missing).toEqual(["хотя бы одна заявка с программой", "сохранённый план с задачами"])
  })
})
