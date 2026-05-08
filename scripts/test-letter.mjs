import Anthropic from "@anthropic-ai/sdk"
import { readFileSync } from "node:fs"

// Read the actual RECOMMENDATION_BASE prompt from prompts.ts
const promptsTs = readFileSync("src/lib/ai/prompts.ts", "utf8")
const baseMatch = promptsTs.match(/const RECOMMENDATION_BASE = `([\s\S]*?)`/)
const RECOMMENDATION_BASE = baseMatch ? baseMatch[1] : ""

// Mini knowledge persona (CORE_PERSONA inline approximation)
const persona = "Ты — AI-стратег Entrium по поступлению. Опираешься на факты. Без AI-клише. Конкретика над пустотой."
const system = persona + "\n\n" + RECOMMENDATION_BASE

const userPrompt = `РЕКОМЕНДАТЕЛЬ:
Имя: Иван Петров
Должность: Учитель математики
Институт: Лицей №2 при ТАШГУ
Email: ivan.petrov@litsey2.uz
Предмет: Calculus AB + Math Olympiad coaching
Знает студента: 2 года, с 10 класса

СТУДЕНТ:
Имя: Saidkarim Tursunbaev
Цель: MIT · BS Computer Science
Уровень: Bachelor

КОНКРЕТИКА:
Достижения: 3-е место в National Math Olympiad 2025 (out of 700 participants), GPA 4.9/5, led 4-person team that built chatbot used by 200+ students
Качества: curiosity, leadership under pressure, analytical thinking
История: When school internet went down before regional Olympiad, Saidkarim organized offline practice sessions for 12 students using printed problem sets — they all qualified for nationals
Зоны роста: initially struggled with public presentations, but by 11 grade was leading TEDx-style school talks

СТИЛЬ:
Язык: Русский
Тон: Академический формальный
Длина: medium (~400 слов)

Напиши полное готовое к отправке рекомендательное письмо.`

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
console.log(`System prompt: ${system.length} chars`)
console.log(`User prompt: ${userPrompt.length} chars`)
console.log()

const start = Date.now()
const res = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 3000,
  system,
  messages: [{ role: "user", content: userPrompt }],
})
const dur = Date.now() - start

const text = res.content[0]?.type === "text" ? res.content[0].text : ""
console.log(`✓ ${text.length} chars · ${res.usage.input_tokens}in/${res.usage.output_tokens}out · ${dur}ms\n`)
console.log("─────── LETTER PREVIEW ───────")
console.log(text)
console.log("─────────────────────────────────")

// Smell test — anti-cliché
const cliches = ["delve into", "tapestry", "passionate about", "exemplary", "hardworking and dedicated", "pleasure to teach"]
const found = cliches.filter(c => text.toLowerCase().includes(c.toLowerCase()))
console.log()
console.log(found.length === 0 ? "✅ No AI clichés detected" : `⚠️ Clichés found: ${found.join(", ")}`)

// Sanity checks
console.log()
console.log("Has metric (700 / 200 / 12):", /700|200|12/.test(text) ? "✅" : "❌")
console.log("Has anecdote (offline / internet):", /(offline|интернет|internet)/i.test(text) ? "✅" : "❌")
console.log("Has signature:", /Иван Петров|Ivan Petrov/.test(text) ? "✅" : "❌")
console.log("Has growth area:", /(public present|TEDx|talks|публичн|выступ)/i.test(text) ? "✅" : "❌")
