import { describe, it, expect } from "vitest"
import { stripChancePercents } from "@/lib/ai/sanitize"

describe("stripChancePercents — no admission percentages (P0-03)", () => {
  it("removes percentage ranges from chance/category lines", () => {
    const r = stripChancePercents("DREAM / REACH (низкие шансы, 10–25%)\nШанс: 35–45% ✅ Сильно рекомендую")
    expect(r.removed).toBe(2)
    expect(r.text).not.toMatch(/%/)
    expect(r.text).toContain("DREAM / REACH (низкие шансы)")
    expect(r.text).toContain("Шанс ✅ Сильно рекомендую")
  })

  it("keeps percentages that are not about chances", () => {
    const src = "Стипендия покрывает 50% обучения\nGPA 4.6/5 — топ-10% класса\nСкидка 25%, 50%, 75%"
    const r = stripChancePercents(src)
    expect(r.removed).toBe(0)
    expect(r.text).toBe(src)
  })

  it("handles English and mixed lines", () => {
    const r = stripChancePercents("Match (30-60% chance) — Bologna\nSafety: ~80 %")
    expect(r.removed).toBe(2)
    expect(r.text).toContain("Match — Bologna")
  })

  it("is a no-op on text without percentages", () => {
    const src = "Категория: match (качественно)\nСоответствие требованиям: соответствует"
    expect(stripChancePercents(src)).toEqual({ text: src, removed: 0 })
  })
})
