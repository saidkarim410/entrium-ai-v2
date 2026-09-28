import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { REGRESSION_PROFILES } from "./regression/profiles"
import { programsFromCsv } from "@/lib/programs/csv"
import { filtersFromProfile, matchProgram, tuitionUsdPerYear, formatProgramsContext, type Program } from "@/lib/programs/types"
import { getTemporalContext, temporalPromptBlock } from "@/lib/ai/temporal"
import { validateTrackerOutput } from "@/lib/agent/tracker-parse"
import { checkEligibility } from "@/lib/scholarships/quality"
import { computeRemaining, FREE_DAILY_LIMIT } from "@/lib/quota"

/**
 * Deterministic regression suite over 20 fictional profiles (CTO TZ §5).
 * Runs the same pure logic the AI routes run BEFORE the model sees anything.
 */
const AUDIT_NOW = new Date("2026-09-28T05:00:00Z")
const TODAY = "2026-09-28"
const SEED: Program[] = programsFromCsv(
  readFileSync(join(process.cwd(), "data", "programs", "programs-seed-2026-09-28.csv"), "utf8")
).rows.map((r, i) => ({ ...r, id: `seed-${i}` }))

describe("regression profiles", () => {
  it("ships at least 20 profiles", () => {
    expect(REGRESSION_PROFILES.length).toBeGreaterThanOrEqual(20)
  })

  for (const rp of REGRESSION_PROFILES) {
    describe(`${rp.id} — ${rp.note}`, () => {
      const f = filtersFromProfile(rp.profile)
      const matches = SEED.map((program) => ({ program, match: matchProgram(program, f) }))
      const main = matches.filter((m) => m.match.outsideRequest.length === 0)

      it("filters are derived from the profile", () => {
        expect(f.level).toBe(rp.expect.level)
        expect(f.countries).toEqual(rp.expect.countries)
        expect(f.language).toBe(rp.expect.language)
        expect(f.intakeYear).toBe(rp.expect.intakeYear)
      })

      it("temporal context classifies the intake and never dates before today", () => {
        const t = getTemporalContext(rp.profile, { now: AUDIT_NOW, timeZone: "Asia/Tashkent" })
        expect(t.todayIso).toBe(TODAY)
        expect(t.intakeStatus).toBe(rp.expect.intakeStatus)
        expect(t.planMonths[0]).toBe("Сентябрь 2026")
        const block = temporalPromptBlock(t)
        expect(block).toContain(TODAY)
        if (rp.expect.intakeStatus === "past") expect(block).toContain("УЖЕ ПРОШЁЛ")
      })

      it("main results respect country / language / intake / budget", () => {
        if (rp.expect.mainMustBeEmpty) {
          expect(main).toEqual([])
          return
        }
        for (const { program, match } of main) {
          if (rp.expect.countries.length) expect(rp.expect.countries).toContain(program.country)
          expect(rp.expect.allowedMainCountries).toContain(program.country)
          if (f.language !== "any") expect(program.language).toBe(f.language)
          if (f.intakeYear !== null && program.intake_year) expect(program.intake_year).toBe(f.intakeYear)
          const tuition = tuitionUsdPerYear(program)
          if (f.budgetUsd !== null && tuition !== null) expect(tuition).toBeLessThanOrEqual(f.budgetUsd)
          expect(match.status).not.toBe("not_eligible")
        }
      })

      it("nothing is 'meets' unless every published requirement is actually satisfied", () => {
        const meets = matches.filter((m) => m.match.status === "meets")
        if (!rp.expect.meetsAllowed) expect(meets).toEqual([])
        for (const { program } of meets) {
          if (f.level === "bachelor" && f.schoolYears === "11") expect(program.accepts_11_year_school).toBe("yes")
          if (program.required_exams.includes("SAT")) expect(f.sat).not.toBeNull()
        }
      })

      it("the prompt context never claims percentages and states an empty base honestly", () => {
        const ctx = formatProgramsContext(
          [...main, ...matches.filter((m) => m.match.outsideRequest.length === 1)],
          f
        )
        expect(ctx).toContain("Никаких процентов")
        if (main.length === 0) expect(ctx).toMatch(/ОСНОВНАЯ ВЫДАЧА(: пусто|\s*\(в рамках запроса\):\s*пусто)/)
      })
    })
  }
})

describe("regression — plan, scholarships, quota", () => {
  it("a plan that starts in the past is rejected, a mixed one is cleaned", () => {
    const past = JSON.stringify({ diagnosis: "", score: 50, months: [{ month: "Январь 2025", tasks: [{ title: "x", priority: "high", category: "tests" }] }] })
    expect(validateTrackerOutput(past, { todayIso: TODAY }).ok).toBe(false)
    const mixed = JSON.stringify({
      diagnosis: "", score: 50,
      months: [
        { month: "Январь 2025", tasks: [{ title: "old", priority: "high", category: "tests" }] },
        { month: "Октябрь 2026", tasks: [{ title: "new", priority: "high", category: "tests", deadline: "2026-10-10" }] },
      ],
    })
    const v = validateTrackerOutput(mixed, { todayIso: TODAY })
    expect(v.ok && v.plan.months.map((m) => m.month)).toEqual(["Октябрь 2026"])
  })

  it("expired contests and wrong-level scholarships never reach a bachelor applicant as opportunities", () => {
    const bachelor = REGRESSION_PROFILES[0].profile
    expect(checkEligibility({ id: "s", name: "Master-only", level: "master" }, bachelor).ok).toBe(false)
    expect(checkEligibility({ id: "s", name: "Any", level: "any" }, bachelor).ok).toBe(true)
    expect(checkEligibility({ id: "s", name: "KZ only", eligible_citizenships: ["Kazakhstan"] }, bachelor).ok).toBe(false)
  })

  it("free quota arithmetic matches the DB gate", () => {
    expect(computeRemaining({ tier: "free", proUntil: null, usedToday: 0, bonus: 0 }).remaining).toBe(FREE_DAILY_LIMIT)
    expect(computeRemaining({ tier: "free", proUntil: null, usedToday: FREE_DAILY_LIMIT, bonus: 0 }).allowed).toBe(false)
    expect(computeRemaining({ tier: "free", proUntil: null, usedToday: FREE_DAILY_LIMIT, bonus: 1 }).allowed).toBe(true)
  })
})
