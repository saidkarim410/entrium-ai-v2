"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { FileUser, Loader2, Sparkles, Copy, Check, Download, FileText, Printer } from "lucide-react"

const FORMATS = [
  { id: "us_ats", label: "US ATS (для США / internships / jobs)" },
  { id: "europass", label: "Europass (для EU applications)" },
  { id: "academic", label: "Academic (для PhD / research)" },
] as const

const LENGTHS = [
  { id: "1page", label: "1 страница (bachelor / master)" },
  { id: "2pages", label: "2 страницы (PhD / experienced)" },
] as const

const LANGS = [
  { id: "English", label: "English" },
  { id: "Русский", label: "Русский" },
] as const

type CVDefaults = {
  name: string; email: string; phone: string; location: string
  linkedin: string; github: string; portfolio: string
  targetRole: string; targetCountry: string
  education: string; experience: string; projects: string
  skillsTech: string; skillsLang: string
  awards: string; activities: string; publications: string
  format: (typeof FORMATS)[number]["id"]
  length: (typeof LENGTHS)[number]["id"]
  lang: (typeof LANGS)[number]["id"]
}

export function CVTool({ initial }: { initial?: CVDefaults } = {}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState<CVDefaults>(initial ?? {
    name: "", email: "", phone: "", location: "",
    linkedin: "", github: "", portfolio: "",
    targetRole: "", targetCountry: "",
    education: "", experience: "", projects: "",
    skillsTech: "", skillsLang: "",
    awards: "", activities: "", publications: "",
    format: "us_ats",
    length: "1page",
    lang: "English",
  })

  const update = (k: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function generate() {
    if (!form.name || !form.email || !form.targetRole) {
      return toast.error("Заполни имя, email и целевой role/program")
    }
    if (!form.education && !form.experience) {
      return toast.error("Нужны Education ИЛИ Experience — иначе CV пустой")
    }
    setLoading(true)
    setResult("")

    const formatLabel = FORMATS.find((f) => f.id === form.format)?.label
    const lengthLabel = LENGTHS.find((l) => l.id === form.length)?.label

    const userPrompt = `LIBERATELY CONVERT RAW DATA INTO POLISHED ATS-FRIENDLY CV.

ЛИЧНЫЕ ДАННЫЕ:
Имя: ${form.name}
Email: ${form.email}
Телефон: ${form.phone || "—"}
Город: ${form.location || "—"}
LinkedIn: ${form.linkedin || "—"}
GitHub: ${form.github || "—"}
Portfolio: ${form.portfolio || "—"}

ЦЕЛЬ:
Целевой role / program: ${form.targetRole}
Целевая страна: ${form.targetCountry || "international"}

EDUCATION (raw, ты должен полировать):
${form.education || "(не указано)"}

EXPERIENCE / WORK / INTERNSHIPS (raw bullets):
${form.experience || "(не указано)"}

PROJECTS (raw):
${form.projects || "(не указано)"}

TECHNICAL SKILLS:
${form.skillsTech || "(не указано)"}

LANGUAGES:
${form.skillsLang || "(не указано)"}

AWARDS & HONORS:
${form.awards || "(не указано)"}

LEADERSHIP & ACTIVITIES:
${form.activities || "(не указано)"}

PUBLICATIONS / RESEARCH (если есть):
${form.publications || "(не указано)"}

ФОРМАТ: ${formatLabel}
ДЛИНА: ${lengthLabel}
ЯЗЫК CV: ${form.lang}

ИНСТРУКЦИИ:
1. Полируй каждый bullet point: action verb → impact metric → result
2. Order секций: Education → Experience → Projects → Skills → Awards → Activities (для bachelor/master). Для academic — Publications сразу после Education
3. НЕ выдумывай данные — если поле пустое, оставь "(добавьте детали)"
4. Используй concrete metrics везде где возможно (X→Y, percentages, scale numbers)
5. Никаких клише: "team player", "passionate", "hard worker"
6. В конце CV отдельной секцией дай "## ✅ Что сделано хорошо" и "## ⚠️ Зоны для улучшения" на русском`

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "cv", user: userPrompt, max_tokens: 6000 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Ошибка")
      setResult(data.text)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Что-то пошло не так")
    } finally {
      setLoading(false)
    }
  }

  function copyResult() {
    if (!result) return
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function downloadFile(ext: "md" | "txt") {
    if (!result) return
    const mime = ext === "md" ? "text/markdown" : "text/plain"
    const blob = new Blob([result], { type: `${mime};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `CV_${form.name.replace(/\s+/g, "_") || "Resume"}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Personal */}
        <Section icon={<FileUser className="h-4 w-4 text-gold" />} title="Личные данные + контакты">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Полное имя" value={form.name} onChange={update("name")} placeholder="Saidkarim Tursunbaev" required />
            <Field label="Email" value={form.email} onChange={update("email")} placeholder="saidkarim@gmail.com" required />
            <Field label="Телефон" value={form.phone} onChange={update("phone")} placeholder="+998 99 205 00 50" />
            <Field label="Город / страна" value={form.location} onChange={update("location")} placeholder="Tashkent, Uzbekistan" />
            <Field label="LinkedIn" value={form.linkedin} onChange={update("linkedin")} placeholder="linkedin.com/in/saidkarim" />
            <Field label="GitHub" value={form.github} onChange={update("github")} placeholder="github.com/saidkarim410" />
          </div>
          <div className="mt-4">
            <Field label="Portfolio (опционально)" value={form.portfolio} onChange={update("portfolio")} placeholder="entrium-ai-v2.vercel.app" />
          </div>
        </Section>

        {/* Target */}
        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Цель — для какого role/program делаем CV">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Role / Program" value={form.targetRole} onChange={update("targetRole")} placeholder="MIT BS Computer Science · Software Engineer Intern at Google · ETH MS Data Science" required />
            <Field label="Страна" value={form.targetCountry} onChange={update("targetCountry")} placeholder="USA · Switzerland · Germany" />
          </div>
        </Section>

        {/* Education */}
        <Section icon={<FileText className="h-4 w-4 text-gold" />} title="Education">
          <FieldArea
            label="Школы / университеты (одна на строку)"
            value={form.education}
            onChange={update("education")}
            placeholder={`Лицей №2 при ТАШГУ — IB Diploma (2023-2027), GPA 4.9/5
Common Curriculum: Math HL, CS HL, Physics SL, English B HL
Relevant coursework: Linear Algebra, Discrete Math, Algorithms`}
            rows={5}
            hint="Формат: «школа — диплом (даты), GPA. Курсы / специализация»"
          />
        </Section>

        {/* Experience */}
        <Section icon={<FileText className="h-4 w-4 text-gold" />} title="Experience / Internships / Work">
          <FieldArea
            label="Опыт (raw bullets — AI отполирует)"
            value={form.experience}
            onChange={update("experience")}
            placeholder={`Software Engineering Intern · Acme Tech (Jun-Aug 2024)
- built API for chat product
- worked on backend in Python
- helped team ship feature

Research Assistant · TashSU CS Lab (2023-2024)
- analyzed data
- wrote scripts for processing`}
            rows={8}
            hint="AI превратит «built API» → «Engineered REST API supporting 12K daily requests with sub-100ms p95 latency»"
          />
        </Section>

        {/* Projects */}
        <Section icon={<FileText className="h-4 w-4 text-gold" />} title="Projects">
          <FieldArea
            label="Проекты (название, что делает, технологии, ссылки)"
            value={form.projects}
            onChange={update("projects")}
            placeholder={`Entrium AI · Next.js, Supabase, AI API
- AI consultant platform for university admissions
- 1500+ universities database with vector search
- 200+ active users
- github.com/saidkarim410/entrium-ai-v2

Math Olympiad Chatbot · Python, Telegram Bot API
- offline practice tool for 200+ students at school`}
            rows={6}
          />
        </Section>

        {/* Skills */}
        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Skills + Languages">
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldArea
              label="Technical Skills (concrete tech stack)"
              value={form.skillsTech}
              onChange={update("skillsTech")}
              placeholder="Python (3 yrs), TypeScript, React, Next.js, PostgreSQL, Docker, AWS Lambda, Git"
              rows={3}
            />
            <FieldArea
              label="Languages (с уровнем)"
              value={form.skillsLang}
              onChange={update("skillsLang")}
              placeholder={`Russian — Native
English — IELTS 7.5 (C1)
Uzbek — Native`}
              rows={3}
            />
          </div>
        </Section>

        {/* Awards */}
        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Awards & Honors">
          <FieldArea
            label="Награды (название, год, контекст)"
            value={form.awards}
            onChange={update("awards")}
            placeholder={`3rd place, National Math Olympiad 2025 (out of 700 participants)
Honorable Mention, Code Wars 2024
Top-10% scholarship, Лицей №2 (2023, 2024)`}
            rows={3}
          />
        </Section>

        {/* Activities */}
        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Leadership & Activities (опционально)">
          <FieldArea
            label="Активности, лидерство, волонтёрство"
            value={form.activities}
            onChange={update("activities")}
            placeholder={`School Tech Club President (2024-2025) — organized 4 hackathons for 80+ participants
Volunteer Math Tutor — taught 12 underprivileged students, all qualified for regional olympiad
TEDx-style speaker at school assembly (2x)`}
            rows={4}
          />
        </Section>

        {/* Publications (academic only) */}
        {form.format === "academic" && (
          <Section icon={<FileText className="h-4 w-4 text-gold" />} title="Publications & Research">
            <FieldArea
              label="Публикации (автор, название, journal/conference, год)"
              value={form.publications}
              onChange={update("publications")}
              placeholder="Tursunbaev S., Doe J. (2025). Vector search for QS rankings. Proceedings of XYZ Conference."
              rows={3}
            />
          </Section>
        )}

        {/* Style */}
        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Стиль">
          <div className="grid sm:grid-cols-3 gap-4">
            <SelectField label="Формат" value={form.format} onChange={update("format")} options={FORMATS.map((f) => f.id)} optionLabels={FORMATS.map((f) => f.label)} />
            <SelectField label="Длина" value={form.length} onChange={update("length")} options={LENGTHS.map((l) => l.id)} optionLabels={LENGTHS.map((l) => l.label)} />
            <SelectField label="Язык CV" value={form.lang} onChange={update("lang")} options={LANGS.map((l) => l.id)} />
          </div>
        </Section>

        <Button onClick={generate} disabled={loading} className="w-full h-12 bg-gold text-background hover:bg-gold-soft font-cinzel">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI полирует CV...</>
            : <><Sparkles className="h-4 w-4 mr-2" /> Сгенерировать CV</>}
        </Button>

        {result && (
          <div className="rounded-xl border border-border bg-card/40 p-7 accent-strip print-area">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2 print-hide">
              <span className="font-mono-label text-gold">📄 CV ГОТОВ</span>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => window.print()} variant="ghost" size="sm" className="gap-2">
                  <Printer className="h-3.5 w-3.5" /> PDF / Print
                </Button>
                <Button onClick={copyResult} variant="ghost" size="sm" className="gap-2">
                  {copied ? <><Check className="h-3.5 w-3.5" /> Скопировано</> : <><Copy className="h-3.5 w-3.5" /> Копировать</>}
                </Button>
                <Button onClick={() => downloadFile("md")} variant="ghost" size="sm" className="gap-2">
                  <Download className="h-3.5 w-3.5" /> .md
                </Button>
                <Button onClick={() => downloadFile("txt")} variant="ghost" size="sm" className="gap-2">
                  <Download className="h-3.5 w-3.5" /> .txt
                </Button>
              </div>
            </div>
            <Markdown>{result}</Markdown>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-6 accent-strip">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <span className="font-mono-label text-cream-3">{title}</span>
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">
        {label}{required && <span className="text-gold ml-1">*</span>}
      </Label>
      <Input value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

function FieldArea({
  label, value, onChange, placeholder, rows = 3, hint,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <Textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} className="font-serif" />
      {hint && <p className="text-xs text-cream-3 italic">{hint}</p>}
    </div>
  )
}

function SelectField({
  label, value, onChange, options, optionLabels,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: readonly string[]
  optionLabels?: readonly string[]
}) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <select value={value} onChange={onChange} className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-cream">
        {options.map((o, i) => <option key={o} value={o}>{optionLabels?.[i] ?? o}</option>)}
      </select>
    </div>
  )
}
