import { describe, it, expect } from "vitest"
import { languageInstruction } from "@/lib/ai/language"

describe("languageInstruction", () => {
  it("returns Russian text for ru locale", () => {
    const out = languageInstruction("ru")
    expect(out).toContain("[LANGUAGE]")
    expect(out).toContain("русском")
    // negative: should not insist English
    expect(out.toLowerCase()).not.toContain("respond in english")
  })

  it("returns English text for en locale", () => {
    const out = languageInstruction("en")
    expect(out).toContain("[LANGUAGE]")
    expect(out).toContain("Respond in English")
  })

  it("returns Uzbek text for uz locale", () => {
    const out = languageInstruction("uz")
    expect(out).toContain("[LANGUAGE]")
    expect(out).toMatch(/o['ʻ`’]?zbek/i)
  })

  it("preserves untranslatable proper nouns instructions", () => {
    for (const lang of ["ru", "en", "uz"] as const) {
      const out = languageInstruction(lang)
      expect(out).toMatch(/SAT|IELTS|TOEFL|GPA/)
    }
  })
})
