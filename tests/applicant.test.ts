import { describe, it, expect } from "vitest"
import {
  EMPTY_PROFILE,
  profileCompleteness,
  profileToContextBlock,
  type ApplicantProfile,
} from "@/lib/applicant/types"

describe("profileCompleteness", () => {
  it("returns 0 for empty profile", () => {
    expect(profileCompleteness(EMPTY_PROFILE)).toBe(0)
  })

  it("returns 100 for fully filled profile", () => {
    const full: ApplicantProfile = {
      personal: { name: "Said", citizenship: "Узбекистан" },
      academic: { gpa: "4.5/5", ielts: "7.5" },
      goals: { level: "Bachelor", major: "CS", targetUnis: "MIT, Stanford" },
      activities: "Robotics club lead",
    }
    expect(profileCompleteness(full)).toBe(100)
  })

  it("counts each filled bucket equally", () => {
    // 2 of 8 buckets filled → 25%
    const partial: ApplicantProfile = {
      personal: { name: "X", citizenship: "Russia" },
      academic: {},
      goals: {},
    }
    expect(profileCompleteness(partial)).toBe(25)
  })

  it("treats experience and activities as one bucket", () => {
    const onlyExp: ApplicantProfile = {
      personal: {},
      academic: {},
      goals: {},
      experience: "Internship",
    }
    const onlyAct: ApplicantProfile = {
      personal: {},
      academic: {},
      goals: {},
      activities: "Club president",
    }
    expect(profileCompleteness(onlyExp)).toBe(profileCompleteness(onlyAct))
  })

  it("any of IELTS/TOEFL/Duolingo counts", () => {
    const withIelts: ApplicantProfile = {
      personal: {}, academic: { ielts: "7" }, goals: {},
    }
    const withDuo: ApplicantProfile = {
      personal: {}, academic: { duolingo: "130" }, goals: {},
    }
    expect(profileCompleteness(withIelts)).toBe(profileCompleteness(withDuo))
  })
})

describe("profileToContextBlock", () => {
  it("returns empty string for empty profile", () => {
    expect(profileToContextBlock(EMPTY_PROFILE)).toBe("")
  })

  it("includes filled fields with Russian labels", () => {
    const p: ApplicantProfile = {
      personal: { name: "Said", citizenship: "Узбекистан" },
      academic: { gpa: "4.5/5", ielts: "7.5" },
      goals: { level: "Bachelor", major: "Computer Science" },
    }
    const out = profileToContextBlock(p)
    expect(out).toContain("[Контекст профиля абитуриента]")
    expect(out).toContain("Имя: Said")
    expect(out).toContain("GPA: 4.5/5")
    expect(out).toContain("IELTS: 7.5")
    expect(out).toContain("Specialty: Computer Science".replace("Specialty", "Специальность"))
  })

  it("omits empty fields", () => {
    const p: ApplicantProfile = {
      personal: { name: "X" },
      academic: {},
      goals: {},
    }
    const out = profileToContextBlock(p)
    expect(out).toContain("Имя: X")
    expect(out).not.toContain("GPA")
    expect(out).not.toContain("IELTS")
    expect(out).not.toContain("Гражданство")
  })
})
