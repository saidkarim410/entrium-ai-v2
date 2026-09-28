import { describe, it, expect } from "vitest"
import { EMPTY_PROFILE, profileCompleteness, missingProfileFields, PROFILE_CHECKS } from "@/lib/applicant/types"

describe("profile completeness explains itself (P1-05)", () => {
  it("empty profile → 0% and every field listed", () => {
    expect(profileCompleteness(EMPTY_PROFILE)).toBe(0)
    expect(missingProfileFields(EMPTY_PROFILE)).toHaveLength(PROFILE_CHECKS.length)
  })

  it("percentage and missing list agree", () => {
    const p = {
      ...EMPTY_PROFILE,
      personal: { name: "A", citizenship: "UZ" },
      academic: { gpa: "4.6/5", ielts: "7.0" },
      goals: { level: "Bachelor" as const, major: "Economics" },
    }
    const missing = missingProfileFields(p)
    expect(missing).toEqual(["целевые университеты", "активности или опыт"])
    expect(profileCompleteness(p)).toBe(Math.round(((PROFILE_CHECKS.length - 2) / PROFILE_CHECKS.length) * 100))
  })
})
