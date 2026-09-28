import { normalizeCountry, normalizeLanguage, normalizeLevel, type Program } from "./types"

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF). Pure. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  const src = text.replace(/^﻿/, "")
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
      continue
    }
    if (c === '"') inQuotes = true
    else if (c === ",") {
      row.push(field)
      field = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++
      row.push(field)
      field = ""
      if (row.some((v) => v.trim() !== "")) rows.push(row)
      row = []
    } else field += c
  }
  row.push(field)
  if (row.some((v) => v.trim() !== "")) rows.push(row)
  return rows
}

export const PROGRAM_CSV_COLUMNS = [
  "university_name", "country", "city", "campus", "program_name", "level", "language",
  "intake", "intake_year", "academic_year", "duration_years",
  "tuition_amount", "tuition_currency", "tuition_period", "tuition_note",
  "admission_requirements", "accepts_11_year_school", "required_exams",
  "english_requirement", "other_language_requirement",
  "application_deadline", "deadline_status", "deadline_note",
  "source_url", "verified_at", "verified_by", "status", "notes",
] as const

export type ProgramImportRow = Omit<Program, "id">

export type CsvImportResult = {
  rows: ProgramImportRow[]
  errors: Array<{ line: number; error: string }>
}

function num(v: string | undefined): number | null {
  const s = (v ?? "").trim().replace(/\s/g, "").replace(",", ".")
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

function opt(v: string | undefined): string | null {
  const s = (v ?? "").trim()
  return s ? s : null
}

/** Header-driven mapping: column order in the file does not matter. */
export function programsFromCsv(text: string): CsvImportResult {
  const table = parseCsv(text)
  if (table.length < 2) return { rows: [], errors: [{ line: 1, error: "Нет строк данных (нужен заголовок + хотя бы одна строка)" }] }
  const header = table[0].map((h) => h.trim().toLowerCase())
  const col = (name: string, cells: string[]) => {
    const i = header.indexOf(name)
    return i === -1 ? undefined : cells[i]
  }
  const missing = ["university_name", "country", "program_name", "level", "source_url"].filter((c) => !header.includes(c))
  if (missing.length) return { rows: [], errors: [{ line: 1, error: `В заголовке нет обязательных колонок: ${missing.join(", ")}` }] }

  const rows: ProgramImportRow[] = []
  const errors: CsvImportResult["errors"] = []

  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2
    const level = normalizeLevel(col("level", cells))
    const uni = opt(col("university_name", cells))
    const name = opt(col("program_name", cells))
    const country = opt(col("country", cells))
    const source = opt(col("source_url", cells))
    if (!uni || !name || !country || !source || !level) {
      errors.push({ line, error: "Обязательные поля: university_name, country, program_name, level (bachelor/master/phd/foundation), source_url" })
      return
    }
    if (!/^https?:\/\//i.test(source)) {
      errors.push({ line, error: `source_url должен быть ссылкой: ${source}` })
      return
    }
    const accepts = (opt(col("accepts_11_year_school", cells)) ?? "unknown").toLowerCase()
    const deadlineStatus = (opt(col("deadline_status", cells)) ?? (opt(col("application_deadline", cells)) ? "published" : "not_published")).toLowerCase()
    const status = (opt(col("status", cells)) ?? "needs_review").toLowerCase()
    const period = (opt(col("tuition_period", cells)) ?? "year").toLowerCase()
    const deadline = opt(col("application_deadline", cells))
    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      errors.push({ line, error: `application_deadline должен быть YYYY-MM-DD: ${deadline}` })
      return
    }
    const verifiedAt = opt(col("verified_at", cells))
    if (verifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(verifiedAt)) {
      errors.push({ line, error: `verified_at должен быть YYYY-MM-DD: ${verifiedAt}` })
      return
    }

    rows.push({
      university_name: uni,
      country: normalizeCountry(country),
      city: opt(col("city", cells)),
      campus: opt(col("campus", cells)),
      program_name: name,
      level,
      language: normalizeLanguage(opt(col("language", cells)) ?? "en"),
      intake: opt(col("intake", cells)),
      intake_year: num(col("intake_year", cells)),
      academic_year: opt(col("academic_year", cells)),
      duration_years: num(col("duration_years", cells)),
      tuition_amount: num(col("tuition_amount", cells)),
      tuition_currency: (opt(col("tuition_currency", cells)) ?? "EUR").toUpperCase(),
      tuition_period: (["year", "total", "semester"].includes(period) ? period : "year") as Program["tuition_period"],
      tuition_note: opt(col("tuition_note", cells)),
      admission_requirements: opt(col("admission_requirements", cells)),
      accepts_11_year_school: (["yes", "no", "conditional", "unknown"].includes(accepts) ? accepts : "unknown") as Program["accepts_11_year_school"],
      required_exams: (opt(col("required_exams", cells)) ?? "")
        .split(/[;|/]/)
        .map((s) => s.trim())
        .filter(Boolean),
      english_requirement: opt(col("english_requirement", cells)),
      other_language_requirement: opt(col("other_language_requirement", cells)),
      application_deadline: deadline,
      deadline_status: (["published", "not_published", "estimated"].includes(deadlineStatus) ? deadlineStatus : "not_published") as Program["deadline_status"],
      deadline_note: opt(col("deadline_note", cells)),
      source_url: source,
      verified_at: verifiedAt,
      verified_by: opt(col("verified_by", cells)),
      status: (["verified", "needs_review", "draft", "archived"].includes(status) ? status : "needs_review") as Program["status"],
      notes: opt(col("notes", cells)),
    })
  })

  return { rows, errors }
}
