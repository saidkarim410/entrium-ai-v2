import { describe, it, expect } from "vitest"
import { parseCsv, programsFromCsv } from "@/lib/programs/csv"

describe("csv parser", () => {
  it("handles quotes, embedded commas and CRLF", () => {
    const rows = parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n')
    expect(rows).toEqual([["a", "b"], ["x, y", 'he said "hi"']])
  })
})

describe("programsFromCsv", () => {
  const header =
    "university_name,country,city,program_name,level,language,intake_year,tuition_amount,tuition_currency,accepts_11_year_school,required_exams,english_requirement,application_deadline,source_url,status"

  it("maps by header name, normalises country/language/level, splits exams", () => {
    const csv = `${header}\nBocconi,Италия,Milan,BSc IEF,Bachelor,английский,2027,14000,EUR,conditional,SAT;TOLC-E,IELTS 6.0,2027-01-31,https://www.unibocconi.eu/,verified`
    const r = programsFromCsv(csv)
    expect(r.errors).toEqual([])
    expect(r.rows[0]).toMatchObject({
      country: "Italy",
      language: "en",
      level: "bachelor",
      required_exams: ["SAT", "TOLC-E"],
      deadline_status: "published",
      status: "verified",
      intake_year: 2027,
    })
  })

  it("rejects rows without an official source or with a bad date", () => {
    const csv = `${header}\nX,Italy,,Prog,bachelor,en,2027,,EUR,unknown,,,31.01.2027,https://x.it/,needs_review\nY,Italy,,Prog,bachelor,en,,,,,,,,,`
    const r = programsFromCsv(csv)
    expect(r.rows).toHaveLength(0)
    expect(r.errors.map((e) => e.line)).toEqual([2, 3])
  })

  it("fails fast when required columns are missing", () => {
    const r = programsFromCsv("name,country\nA,B")
    expect(r.rows).toHaveLength(0)
    expect(r.errors[0].error).toContain("обязательных колонок")
  })
})
