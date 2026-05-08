import Anthropic from "@anthropic-ai/sdk"
import { readFileSync } from "node:fs"

const promptsTs = readFileSync("src/lib/ai/prompts.ts", "utf8")
const baseMatch = promptsTs.match(/const REVIEWER_BASE = `([\s\S]*?)`/)
const REVIEWER_BASE = baseMatch ? baseMatch[1] : ""

const persona = "Ты — AI-стратег Entrium. Опираешься на факты. Без AI-клише."
const system = persona + "\n\n" + REVIEWER_BASE

// Test with a deliberately weak essay to see if AI catches it
const userPrompt = `MOCK ADMISSION REVIEW

ВАЖНО: оцени как admission officer Top-10 Ivy уровня. Брутальная честность.

═══════════════════════════════════════════
TARGET UNIVERSITY:
═══════════════════════════════════════════
University: Harvard University
Program: BA Computer Science
Application Round: Restrictive Early Action (REA)
Deadline: 1 ноября 2026

═══════════════════════════════════════════
APPLICANT PROFILE:
═══════════════════════════════════════════
Citizenship: Узбекистан
School type: National Lyceum, public
GPA: 4.5/5
Test scores: SAT 1380, IELTS 7.0
AP/IB exams: AP Calc AB: 4, AP CS A: 4

═══════════════════════════════════════════
PERSONAL STATEMENT:
═══════════════════════════════════════════
Ever since I was a young child, I have always been passionate about computer science. From my earliest memories, I remember being fascinated by computers and how they work. As I grew older, this passion only deepened, and I knew I wanted to pursue computer science at the highest level.

Throughout my high school years, I have worked hard and demonstrated my dedication to learning. I am a hardworking student who always gives 100% to everything I do. I am also a great team player and have many leadership skills that will help me succeed in college and beyond.

Computer science is a multifaceted field that allows one to delve into the tapestry of human knowledge and innovation. It is my dream to attend Harvard University, which is a prestigious institution that will provide me with the resources and opportunities I need to achieve my goals. Harvard's strong CS program and network of accomplished alumni will help me become the best version of myself.

In conclusion, I believe I would be an excellent fit for Harvard. My passion, hard work, and dedication to computer science make me a strong candidate. I look forward to contributing to the Harvard community and learning from the world-class faculty and students.

═══════════════════════════════════════════
EXTRACURRICULAR ACTIVITIES:
═══════════════════════════════════════════
1. Member · Computer Club · 10-12 grade · 2 hrs/week
   - Participated in club activities
   - Helped organize one event

2. Volunteer · Local school · 11-12 grade · 1 hr/week
   - Helped students with homework

3. Student · School · 9-12 grade · 40 hrs/week
   - Studied various subjects
   - Maintained good grades

═══════════════════════════════════════════
AWARDS & HONORS:
═══════════════════════════════════════════
1. Honorable Mention, City Math Olympiad 2024 — city level
2. Top student award, school 2024

═══════════════════════════════════════════
RECOMMENDERS:
═══════════════════════════════════════════
1. Math Teacher — knew for 1 year
2. Principal — formal letter

═══════════════════════════════════════════
ДЕМОГРАФИЯ:
═══════════════════════════════════════════
Uzbek, first-gen, low-income family

ИНСТРУКЦИИ: Будь брутально честен. Это явно слабая заявка для Harvard. Найди КОНКРЕТНЫЕ проблемы.`

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
console.log(`System: ${system.length} · User: ${userPrompt.length}\n`)

const start = Date.now()
const res = await client.messages.create({
  model: "claude-haiku-4-5-20251001",
  max_tokens: 8000,
  system,
  messages: [{ role: "user", content: userPrompt }],
})
const dur = Date.now() - start
const text = res.content[0]?.type === "text" ? res.content[0].text : ""

console.log(`✓ ${text.length} chars · ${res.usage.input_tokens}in/${res.usage.output_tokens}out · ${dur}ms\n`)
console.log("─────── REVIEW PREVIEW ───────")
console.log(text.slice(0, 5000))
if (text.length > 5000) console.log("...\n[" + (text.length - 5000) + " more chars]")
console.log("─────────────────────────────────\n")

console.log("═══ Quality Checks ═══")
console.log("✓ Has verdict:", /Финальный вердикт|REJECT|LIKELY|ADMIT|BORDERLINE|🎯/i.test(text) ? "✅" : "❌")
console.log("✓ Honest verdict (rejected/borderline):", /REJECT|LIKELY REJECT|BORDERLINE|likely.{0,20}reject|low chance|3-5%/i.test(text) ? "✅" : "❌ AI was too soft")
console.log("✓ Has component scores:", /Score|\/10/.test(text) ? "✅" : "❌")
console.log("✓ Catches AI clichés in essay:", /(passionate|delve into|tapestry|multifaceted|hardworking|team player|in conclusion|since I was|hard work)/i.test(text) ? "✅" : "❌")
console.log("✓ Mentions weak SAT/GPA for Harvard:", /SAT.*1380|GPA.*4\.5|test.{0,30}(low|weak|under)|score.{0,30}(low|weak|under)/i.test(text) ? "✅" : "❌")
console.log("✓ Mentions weak ECs:", /ec|extracurric|activit.{0,30}(weak|generic|shallow|lack)|2.{0,5}hrs|generic|surface/i.test(text) ? "✅" : "❌")
console.log("✓ Has specific edits:", /✏️|edits|правки|specific|конкретно/i.test(text) ? "✅" : "❌")
console.log("✓ Has red flags:", /Red flags|⚠️|🚨/i.test(text) ? "✅" : "❌")
console.log("✓ Has final checklist:", /checklist|чеклист|✅|Final/i.test(text) ? "✅" : "❌")
