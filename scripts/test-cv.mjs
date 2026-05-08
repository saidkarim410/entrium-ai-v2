import Anthropic from "@anthropic-ai/sdk"
import { readFileSync } from "node:fs"

const promptsTs = readFileSync("src/lib/ai/prompts.ts", "utf8")
const baseMatch = promptsTs.match(/const CV_BASE = `([\s\S]*?)`/)
const CV_BASE = baseMatch ? baseMatch[1] : ""

const persona = "Ты — AI-стратег Entrium по поступлению. Опираешься на факты. Без AI-клише. Конкретика над пустотой."
const system = persona + "\n\n" + CV_BASE

const userPrompt = `LIBERATELY CONVERT RAW DATA INTO POLISHED ATS-FRIENDLY CV.

ЛИЧНЫЕ ДАННЫЕ:
Имя: Saidkarim Tursunbaev
Email: saidkarim@entrium.ai
Телефон: +998 99 205 00 50
Город: Tashkent, Uzbekistan
LinkedIn: linkedin.com/in/saidkarim
GitHub: github.com/saidkarim410

ЦЕЛЬ:
Целевой role / program: MIT BS Computer Science · Software Engineering Intern
Целевая страна: USA

EDUCATION (raw):
Лицей №2 при ТАШГУ — IB Diploma (2023-2027), GPA 4.9/5
Math HL, CS HL, Physics SL, English B HL
Relevant coursework: Linear Algebra, Discrete Math, Algorithms

EXPERIENCE / WORK / INTERNSHIPS (raw bullets):
Software Engineering Intern · Acme Tech (Jun-Aug 2024)
- built API for chat product
- worked on backend in Python
- helped team ship feature

Research Assistant · TashSU CS Lab (2023-2024)
- analyzed data
- wrote scripts for processing

PROJECTS (raw):
Entrium AI · Next.js, Supabase, Claude API
- AI consultant platform for university admissions
- 1500+ universities database with vector search
- 200+ active users
- github.com/saidkarim410/entrium-ai-v2

TECHNICAL SKILLS:
Python (3 yrs), TypeScript, React, Next.js, PostgreSQL, Docker, AWS Lambda, Git

LANGUAGES:
Russian — Native
English — IELTS 7.5 (C1)
Uzbek — Native

AWARDS & HONORS:
3rd place, National Math Olympiad 2025 (out of 700 participants)
Top-10% scholarship, Лицей №2 (2023, 2024)

LEADERSHIP & ACTIVITIES:
School Tech Club President (2024-2025) — organized 4 hackathons for 80+ participants

ФОРМАТ: US ATS
ДЛИНА: 1 страница
ЯЗЫК CV: English

ИНСТРУКЦИИ:
1. Полируй каждый bullet point: action verb → impact metric → result
2. Order секций: Education → Experience → Projects → Skills → Awards → Activities
3. НЕ выдумывай данные
4. Используй concrete metrics везде где возможно
5. Никаких клише
6. В конце CV дай "## ✅ Что сделано хорошо" и "## ⚠️ Зоны для улучшения" на русском`

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
console.log(`System: ${system.length} chars · User: ${userPrompt.length} chars\n`)

const start = Date.now()
const res = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 4000,
  system,
  messages: [{ role: "user", content: userPrompt }],
})
const dur = Date.now() - start
const text = res.content[0]?.type === "text" ? res.content[0].text : ""

console.log(`✓ ${text.length} chars · ${res.usage.input_tokens}in/${res.usage.output_tokens}out · ${dur}ms\n`)
console.log("─────── CV PREVIEW ───────")
console.log(text.slice(0, 3000))
if (text.length > 3000) console.log("...\n[" + (text.length - 3000) + " more chars]")
console.log("─────────────────────────────────\n")

const cliches = ["hardworking", "team player", "passionate", "detail-oriented", "self-starter", "results-driven", "synergize", "leverage", "delve into"]
const found = cliches.filter(c => text.toLowerCase().includes(c.toLowerCase()))
console.log(found.length === 0 ? "✅ No CV clichés detected" : `⚠️ Clichés: ${found.join(", ")}`)
console.log(/^\s*[-•]\s*Built|Engineered|Led|Designed|Achieved|Reduced|Increased|Founded/im.test(text) ? "✅ Has action verbs at start of bullets" : "⚠️ Missing action verbs")
console.log(/200\+|700|80\+|3rd|4\.9/.test(text) ? "✅ Preserved metrics from input" : "⚠️ Lost metrics")
console.log(/MIT|Computer Science|Software Engineering/.test(text) ? "✅ Aligned with target role" : "⚠️ Not aligned")
console.log(/✅ Что сделано хорошо/.test(text) ? "✅ Has feedback section" : "⚠️ Missing feedback")
