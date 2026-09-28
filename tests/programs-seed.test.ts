import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { programsFromCsv } from "@/lib/programs/csv"
import { filtersFromProfile, matchProgram } from "@/lib/programs/types"
import { EMPTY_PROFILE } from "@/lib/applicant/types"

/**
 * Data hygiene for the shipped programme CSVs: every seed file must import
 * without errors, every row must carry an official source and a review status,
 * and the TZ test profile must never see Austria or a German-taught programme
 * in its main results.
 */
const DIR = join(process.cwd(), "data", "programs")
const seeds = readdirSync(DIR).filter((f) => f.startsWith("programs-seed") && f.endsWith(".csv"))

const tzProfile = {
  ...EMPTY_PROFILE,
  personal: { citizenship: "Узбекистан" },
  academic: { schoolYears: "11", graduation: "июнь 2027", gpa: "4.6/5", ielts: "7.0" },
  goals: {
    level: "Bachelor" as const,
    year: "2027",
    major: "Economics and Finance",
    countries: "Италия, Германия",
    budget: "$10 000 в год, включая обучение и проживание",
    instructionLanguage: "английский",
  },
}

describe("programme seed files", () => {
  it("at least one seed file ships", () => {
    expect(seeds.length).toBeGreaterThan(0)
  })

  for (const file of seeds) {
    it(`${file} imports cleanly and every row is sourced`, () => {
      const { rows, errors } = programsFromCsv(readFileSync(join(DIR, file), "utf8"))
      expect(errors).toEqual([])
      expect(rows.length).toBeGreaterThan(0)
      for (const r of rows) {
        expect(r.source_url).toMatch(/^https:\/\//)
        expect(["verified", "needs_review", "draft", "archived"]).toContain(r.status)
        expect(r.verified_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(r.intake_year).toBe(2027)
      }
    })

    it(`${file}: TZ profile never gets Austria or non-English programmes in the main results`, () => {
      const { rows } = programsFromCsv(readFileSync(join(DIR, file), "utf8"))
      const f = filtersFromProfile(tzProfile)
      for (const r of rows) {
        const m = matchProgram({ ...r, id: "seed" }, f)
        if (m.outsideRequest.length === 0) {
          expect(r.country).not.toBe("Austria")
          expect(r.language).toBe("en")
          expect(["Italy", "Germany"]).toContain(r.country)
        }
        // an 11-year applicant is never told "meets" by a programme that hasn't confirmed 11-year access
        if (r.accepts_11_year_school !== "yes") expect(m.status).not.toBe("meets")
      }
    })
  }
})
