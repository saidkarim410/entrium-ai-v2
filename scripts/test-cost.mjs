import Anthropic from "@anthropic-ai/sdk"
import { readFileSync } from "node:fs"

const promptsTs = readFileSync("src/lib/ai/prompts.ts", "utf8")
const baseMatch = promptsTs.match(/const COST_BASE = `([\s\S]*?)`/)
const COST_BASE = baseMatch ? baseMatch[1] : ""

const persona = "Ты — AI-стратег Entrium по поступлению. Опираешься на факты. Без AI-клише. Конкретика над пустотой."
const system = persona + "\n\n" + COST_BASE

const userPrompt = `РАСЧЁТ СТОИМОСТИ ОБУЧЕНИЯ ЗА РУБЕЖОМ:

Страна: Germany
Город: Munich
Целевой университет: TU Munich (Technical University of Munich)
Уровень: Bachelor
Длительность программы: 3 лет
Образ жизни: Стандартно (студия, периодически кафе)
Специальность: Computer Science

Имеющаяся стипендия: $0/год (пока нет)
Доступный годовой бюджет студента: $15000/год
Гражданство: Узбекистан

Дополнительно: low income family, готов работать part-time

Язык ответа: Русский`

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
console.log(`System: ${system.length} · User: ${userPrompt.length}\n`)

const start = Date.now()
const res = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 6000,
  system,
  messages: [{ role: "user", content: userPrompt }],
})
const dur = Date.now() - start
const text = res.content[0]?.type === "text" ? res.content[0].text : ""

console.log(`✓ ${text.length} chars · ${res.usage.input_tokens}in/${res.usage.output_tokens}out · ${dur}ms\n`)
console.log("─────── COST PLAN PREVIEW ───────")
console.log(text.slice(0, 4000))
if (text.length > 4000) console.log("...\n[" + (text.length - 4000) + " more chars]")
console.log("─────────────────────────────────\n")

console.log("✓ Has total cost section:", /Итоговая стоимость|Total cost|💰/i.test(text) ? "✅" : "❌")
console.log("✓ Has annual breakdown:", /Annual Breakdown|Tuition|Accommodation/i.test(text) ? "✅" : "❌")
console.log("✓ Has hidden costs:", /Hidden|Скрытые|Скрытые расходы|visa|blocked|🚨/i.test(text) ? "✅" : "❌")
console.log("✓ Has financial aid:", /Financial Aid|Стипендии|DAAD|Erasmus|🎓/i.test(text) ? "✅" : "❌")
console.log("✓ Has Germany-specific (DAAD or blocked account):", /DAAD|blocked account|Sperrkonto/i.test(text) ? "✅" : "❌")
console.log("✓ Has EUR/USD currency:", /EUR|€|USD|\$/i.test(text) ? "✅" : "❌")
console.log("✓ Has realistic gap analysis:", /Реалистичность|gap|потянуть|реально/i.test(text) ? "✅" : "❌")
console.log("✓ Mentions Узбекистан / El-Yurt:", /Узбекистан|El-Yurt|Erasmus.+Уз/i.test(text) ? "✅" : "❌")
