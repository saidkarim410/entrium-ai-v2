/**
 * Calendar-date helpers (P0-04). A deadline is a DATE, not a timestamp:
 * "2026-10-15" must render as 15 October everywhere, in every timezone.
 * `new Date("2026-10-15")` is UTC midnight and shows 14 October west of
 * Greenwich — so nothing here goes through the ISO-string Date constructor.
 */

export const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return false
  const probe = new Date(Date.UTC(y, m - 1, d))
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * Accept what people actually type — "2026-10-15", "15.10.2026", "15/10/2026",
 * "15-10-2026", "15 10 2026" — and return canonical YYYY-MM-DD, or null when
 * the input is not an unambiguous real calendar date. Empty input → "".
 */
export function parseDateInput(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim()
  if (!s) return ""
  const iso = s.match(ISO_DATE_RE)
  if (iso) {
    const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    return isRealDate(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null
  }
  // Datetime strings ("2026-10-15T00:00:00Z") → keep the calendar part only
  const isoPrefix = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ]/)
  if (isoPrefix) {
    const [y, m, d] = [Number(isoPrefix[1]), Number(isoPrefix[2]), Number(isoPrefix[3])]
    return isRealDate(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null
  }
  const dmy = s.match(/^(\d{1,2})[./\-\s](\d{1,2})[./\-\s](\d{4})$/)
  if (dmy) {
    const [d, m, y] = [Number(dmy[1]), Number(dmy[2]), Number(dmy[3])]
    return isRealDate(y, m, d) ? `${y}-${pad(m)}-${pad(d)}` : null
  }
  return null
}

/** Local-midnight Date for a YYYY-MM-DD string (null for anything else). */
export function parseIsoDateLocal(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (!isRealDate(y, mo, d)) return null
  return new Date(y, mo - 1, d)
}

/** Today's calendar date in the runtime's local zone as YYYY-MM-DD. */
export function localTodayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Whole days from today (local) to the ISO date; negative if past; null if unparseable. */
export function daysFromToday(iso: string | null | undefined, now: Date = new Date()): number | null {
  const target = parseIsoDateLocal(iso)
  if (!target) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // +0 normalises -0 (Math.round of a tiny negative) to canonical 0
  return Math.round((target.getTime() - today.getTime()) / 86_400_000) + 0
}

/** "15 окт. 2026" style formatting that never shifts by timezone. */
export function formatIsoDate(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" },
  locale = "ru-RU"
): string {
  const d = parseIsoDateLocal(iso)
  if (!d) return iso ?? ""
  return d.toLocaleDateString(locale, options)
}
