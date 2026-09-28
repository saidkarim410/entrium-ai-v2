/**
 * Output guards for the "no admission percentages" rule (CTO TZ P0-03).
 *
 * The prompts forbid "X% chance" — there is no validated model behind such a number —
 * but the cheaper model still writes "REACH (10–25%)" or "Шанс: 35–45%" now and then
 * (seen in the 2026-09-28 regression run). Percentages are stripped only from lines
 * that talk about chances/categories, so "стипендия покрывает 50%" or
 * "GPA 4.6/5 (топ-10%)" stay intact.
 */

const CHANCE_WORDS =
  /шанс|вероятн|chance|probab|likelihood|odds|\breach\b|\bmatch\b|\bsafety\b|\bdream\b|ehtimol|imkoniyat/i

// "10–25%", "~40 %", "35-45%", "12%"
const PERCENT = /~?\d{1,3}(?:[.,]\d)?\s*(?:[–—-]\s*\d{1,3}(?:[.,]\d)?)?\s*%/g

export type SanitizeResult = { text: string; removed: number }

/** Remove "chance" percentages line by line; report how many were removed. */
export function stripChancePercents(text: string): SanitizeResult {
  let removed = 0
  const lines = text.split("\n").map((line) => {
    if (!CHANCE_WORDS.test(line)) return line
    const hits = line.match(PERCENT)
    if (!hits) return line
    removed += hits.length
    return (
      line
        .replace(PERCENT, "")
        // what the removal leaves behind: "( chance)" / "()" → "", "(низкие шансы, )" → "(низкие шансы)"
        .replace(/\(\s*(?:chance|odds|шанс\w*|вероятност\w*)?\s*\)/gi, "")
        .replace(/,\s*\)/g, ")")
        .replace(/\(\s*,\s*/g, "(")
        // "Шанс: ✅" → "Шанс ✅", trailing "Safety:" → "Safety"
        .replace(/:\s*(?=[✅⚠️❌🔥⭐]|$)/g, " ")
        .replace(/\s{2,}/g, " ")
        .replace(/\s+([,.;)])/g, "$1")
        .replace(/\(\s+/g, "(")
        .trimEnd()
    )
  })
  return { text: lines.join("\n"), removed }
}

export const PERCENT_WARNING =
  "Модель указала проценты шансов — они убраны: проверенной методики расчёта вероятности поступления нет, ориентируйся на статусы соответствия."
