import { describe, it, expect } from "vitest"
import {
  bestEnglishTest,
  bestStandardizedTest,
  profileDefaults,
  analyzerDefaults,
  reviewerDefaults,
} from "@/lib/applicant/prefill"
import type { ApplicantProfile } from "@/lib/applicant/types"

const baseProfile = (over: Partial<ApplicantProfile> = {}): ApplicantProfile => ({
  personal: {},
  academic: {},
  goals: {},
  ...over,
})

describe("bestEnglishTest", () => {
  it("returns empty string when no test", () => {
    expect(bestEnglishTest(baseProfile())).toBe("")
  })

  it("prefers IELTS over TOEFL over Duolingo", () => {
    const p = baseProfile({
      academic: { ielts: "7.5", toefl: "105", duolingo: "135" },
    })
    expect(bestEnglishTest(p)).toBe("IELTS 7.5")
  })

  it("falls back to TOEFL when no IELTS", () => {
    const p = baseProfile({ academic: { toefl: "105", duolingo: "135" } })
    expect(bestEnglishTest(p)).toBe("TOEFL 105")
  })

  it("falls back to Duolingo when no IELTS or TOEFL", () => {
    const p = baseProfile({ academic: { duolingo: "135" } })
    expect(bestEnglishTest(p)).toBe("Duolingo 135")
  })
})

describe("bestStandardizedTest", () => {
  it("returns SAT raw when present (no prefix per current behavior)", () => {
    const p = baseProfile({ academic: { sat: "1500" } })
    expect(bestStandardizedTest(p)).toBe("1500")
  })

  it("falls back to ACT with prefix", () => {
    const p = baseProfile({ academic: { act: "33" } })
    expect(bestStandardizedTest(p)).toBe("ACT 33")
  })

  it("returns empty when neither", () => {
    expect(bestStandardizedTest(baseProfile())).toBe("")
  })
})

describe("profileDefaults", () => {
  it("hardcodes level=11 класс", () => {
    expect(profileDefaults(baseProfile()).level).toBe("11 класс")
  })

  it("default year is 2027 when goals.year missing", () => {
    expect(profileDefaults(baseProfile()).year).toBe("2027")
  })

  it("default citizenship is Узбекистан when missing", () => {
    expect(profileDefaults(baseProfile()).citizenship).toBe("Узбекистан")
  })

  it("flattens activities + awards + experience into 'extra'-style fields", () => {
    const p = baseProfile({ activities: "club", awards: "olympiad" })
    const d = profileDefaults(p)
    expect(d.extra).toContain("club")
    expect(d.awards).toContain("olympiad")
  })
})

describe("analyzerDefaults", () => {
  it("merges activities + awards + experience into single profile string", () => {
    const p = baseProfile({
      activities: "Robotics club",
      awards: "Math olympiad gold",
      experience: "Intern at startup",
    })
    const d = analyzerDefaults(p)
    expect(d.profile).toContain("Robotics club")
    expect(d.profile).toContain("Math olympiad gold")
    expect(d.profile).toContain("Intern at startup")
  })

  it("skips missing parts in profile merge", () => {
    const p = baseProfile({ activities: "Only this" })
    expect(analyzerDefaults(p).profile).toBe("Only this")
  })
})

describe("reviewerDefaults", () => {
  it("default round is RD", () => {
    expect(reviewerDefaults(baseProfile()).round).toBe("Regular Decision (RD)")
  })

  it("picks first university from comma-separated targetUnis", () => {
    const p = baseProfile({ goals: { targetUnis: "MIT, Stanford, Harvard" } })
    expect(reviewerDefaults(p).university).toBe("MIT")
  })

  it("combines SAT + IELTS into tests string", () => {
    const p = baseProfile({ academic: { sat: "1500", ielts: "7.5" } })
    const d = reviewerDefaults(p)
    expect(d.tests).toContain("SAT 1500")
    expect(d.tests).toContain("IELTS 7.5")
  })
})
