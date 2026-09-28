import { describe, it, expect } from "vitest"
import { normalizeApplicationInput } from "@/lib/applications/normalize"

describe("normalizeApplicationInput (P0-04)", () => {
  it("normalises a typed DD.MM.YYYY deadline to ISO", () => {
    const r = normalizeApplicationInput({ university_name: " Bocconi ", deadline: "15.10.2026" })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.row).toMatchObject({ university_name: "Bocconi", deadline: "2026-10-15" })
  })

  it("rejects an unparseable deadline instead of saving NULL", () => {
    const r = normalizeApplicationInput({ university_name: "Bocconi", deadline: "в октябре" })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.field).toBe("deadline")
      expect(r.error).toContain("ДД.ММ.ГГГГ")
    }
  })

  it("empty deadline is NULL (no deadline), not an error", () => {
    const r = normalizeApplicationInput({ university_name: "Bocconi", deadline: "" })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.row.deadline).toBeNull()
  })

  it("full insert fills defaults", () => {
    const r = normalizeApplicationInput({ university_name: "Bocconi", status: "nope" as never, level: "" })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.row.status).toBe("planning")
      expect(r.row.priority).toBe("match")
      expect(r.row.level).toBeNull()
      expect(r.row.checklist).toEqual([])
      expect(r.row.deadline).toBeNull()
    }
  })

  it("partial update touches only the keys that were sent (checklist survives an edit)", () => {
    const r = normalizeApplicationInput(
      { id: "x", university_name: "Bocconi", notes: "new notes" },
      { partial: true }
    )
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.row).toEqual({ university_name: "Bocconi", notes: "new notes" })
      expect("checklist" in r.row).toBe(false)
      expect("deadline" in r.row).toBe(false)
      expect("result_decision" in r.row).toBe(false)
    }
  })

  it("requires a university name", () => {
    const r = normalizeApplicationInput({ university_name: "  " })
    expect(r.ok).toBe(false)
  })

  it("parses the fee from a string", () => {
    const r = normalizeApplicationInput({ university_name: "X", application_fee_usd: "75" })
    if (r.ok) expect(r.row.application_fee_usd).toBe(75)
    const none = normalizeApplicationInput({ university_name: "X", application_fee_usd: "" })
    if (none.ok) expect(none.row.application_fee_usd).toBeNull()
  })
})
