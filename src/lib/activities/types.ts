/**
 * Common App-style activity record. Stored in applicant_data.activities_structured
 * as an array of up to 10 ActivityEntry objects.
 *
 * The Common Application allows up to 10 activities; the most-meaningful one is
 * featured at the top and gets a longer essay slot. We store the entire structure
 * client-side as profile data — no separate table.
 */

export const ACTIVITY_TYPES = [
  "Academic",
  "Art",
  "Athletics: Club",
  "Athletics: JV/Varsity",
  "Career-Oriented",
  "Community Service (Volunteer)",
  "Computer/Technology",
  "Cultural",
  "Dance",
  "Debate/Speech",
  "Environmental",
  "Family Responsibilities",
  "Foreign Exchange",
  "Internship",
  "Journalism/Publication",
  "Junior R.O.T.C.",
  "LGBT",
  "Music: Instrumental",
  "Music: Vocal",
  "Religious",
  "Research",
  "Robotics",
  "School Spirit",
  "Science/Math",
  "Student Govt./Politics",
  "Theater/Drama",
  "Work (Paid)",
  "Other Club/Activity",
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const GRADE_LEVELS = ["9", "10", "11", "12", "PG"] as const
export type GradeLevel = (typeof GRADE_LEVELS)[number]

export type ActivityEntry = {
  id: string
  type: ActivityType | ""
  position: string         // e.g. "President" — Common App: 50 chars
  organization: string     // e.g. "Math Olympiad Club" — 100 chars
  description: string      // 150 chars max for Common App
  grades: GradeLevel[]     // years participated
  hoursPerWeek: string     // free-text number
  weeksPerYear: string     // free-text number
  continue_in_college: boolean
}

export const COMMON_APP_LIMITS = {
  position: 50,
  organization: 100,
  description: 150,
} as const

export function emptyActivity(): ActivityEntry {
  return {
    id: crypto.randomUUID(),
    type: "",
    position: "",
    organization: "",
    description: "",
    grades: [],
    hoursPerWeek: "",
    weeksPerYear: "",
    continue_in_college: false,
  }
}

export function activityCharCount(field: keyof typeof COMMON_APP_LIMITS, value: string): {
  count: number
  limit: number
  over: boolean
  warning: boolean
} {
  const count = value.length
  const limit = COMMON_APP_LIMITS[field]
  return {
    count,
    limit,
    over: count > limit,
    warning: count > limit * 0.85,
  }
}

export function activitiesToPlainText(items: ActivityEntry[]): string {
  return items
    .filter((a) => a.position || a.organization || a.description)
    .map((a, i) => {
      const lines: string[] = [`${i + 1}. ${a.position || "—"}${a.organization ? ` · ${a.organization}` : ""}${a.type ? ` (${a.type})` : ""}`]
      if (a.description) lines.push(`   ${a.description}`)
      const meta = [
        a.grades.length ? `Grades: ${a.grades.join(", ")}` : "",
        a.hoursPerWeek ? `${a.hoursPerWeek} hr/wk` : "",
        a.weeksPerYear ? `${a.weeksPerYear} wk/yr` : "",
        a.continue_in_college ? "→ continue in college" : "",
      ].filter(Boolean).join(" · ")
      if (meta) lines.push(`   ${meta}`)
      return lines.join("\n")
    })
    .join("\n\n")
}
