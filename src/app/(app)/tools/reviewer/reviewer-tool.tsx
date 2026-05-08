"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Markdown } from "@/components/markdown"
import { ShieldCheck, Loader2, Sparkles, Copy, Check, Download, AlertTriangle } from "lucide-react"

const ROUNDS = [
  "Early Decision (ED)",
  "Restrictive Early Action (REA)",
  "Early Action (EA)",
  "Regular Decision (RD)",
  "Rolling",
  "UCAS deadline (UK)",
  "Other",
] as const

const STRICTNESS = [
  { id: "ivy", label: "Harvard / MIT / Stanford / Princeton (Top-10 Ivy)" },
  { id: "top30", label: "Top-30 US (Cornell, Brown, NYU, UCLA, Berkeley)" },
  { id: "top50", label: "Top-50 (UMich, Wisconsin, Duke, Northwestern)" },
  { id: "oxbridge", label: "Oxbridge / Imperial / LSE / UCL" },
  { id: "topeu", label: "ETH / EPFL / TU Munich / KU Leuven" },
  { id: "topasia", label: "NUS / NTU / KAIST / HKU" },
] as const

export function ReviewerTool() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState("")
  const [copied, setCopied] = useState(false)

  const [form, setForm] = useState({
    // Target
    university: "",
    program: "",
    round: "Regular Decision (RD)" as (typeof ROUNDS)[number],
    deadline: "",
    strictness: "top30" as (typeof STRICTNESS)[number]["id"],
    // Profile
    citizenship: "Узбекистан",
    schoolType: "",
    gpa: "",
    tests: "",
    apIb: "",
    // Essays
    personalStatement: "",
    supplemental1: "",
    supplemental2: "",
    supplemental3: "",
    // Activities
    activities: "",
    awards: "",
    // Recommenders
    recommenders: "",
    // Demographics + Context
    demographics: "",
    constraints: "",
  })

  const update = (k: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function review() {
    if (!form.university || !form.program) {
      return toast.error("Укажи целевой university и program")
    }
    if (!form.personalStatement || !form.activities) {
      return toast.error("Нужны хотя бы Personal Statement + Activities — без них review будет поверхностным")
    }
    setLoading(true)
    setResult("")

    const strictnessLabel = STRICTNESS.find((s) => s.id === form.strictness)?.label

    const userPrompt = `MOCK ADMISSION REVIEW

ВАЖНО: оцени как admission officer указанной строгости (${strictnessLabel}).
Будь brutally honest. Не льсти. Найди конкретные проблемы.

═══════════════════════════════════════════
TARGET UNIVERSITY:
═══════════════════════════════════════════
University: ${form.university}
Program: ${form.program}
Application Round: ${form.round}
Deadline: ${form.deadline || "не указан"}

═══════════════════════════════════════════
APPLICANT PROFILE:
═══════════════════════════════════════════
Citizenship: ${form.citizenship}
School type: ${form.schoolType || "—"}
GPA: ${form.gpa || "—"}
Test scores: ${form.tests || "—"}
AP/IB exams: ${form.apIb || "—"}

═══════════════════════════════════════════
PERSONAL STATEMENT (Common App / UCAS):
═══════════════════════════════════════════
${form.personalStatement || "(не предоставлен)"}

═══════════════════════════════════════════
SUPPLEMENTAL ESSAY 1:
═══════════════════════════════════════════
${form.supplemental1 || "(нет)"}

═══════════════════════════════════════════
SUPPLEMENTAL ESSAY 2:
═══════════════════════════════════════════
${form.supplemental2 || "(нет)"}

═══════════════════════════════════════════
SUPPLEMENTAL ESSAY 3:
═══════════════════════════════════════════
${form.supplemental3 || "(нет)"}

═══════════════════════════════════════════
EXTRACURRICULAR ACTIVITIES (Common App format):
═══════════════════════════════════════════
${form.activities || "(не предоставлены)"}

═══════════════════════════════════════════
AWARDS & HONORS:
═══════════════════════════════════════════
${form.awards || "(не указаны)"}

═══════════════════════════════════════════
RECOMMENDERS (кто пишет + статус):
═══════════════════════════════════════════
${form.recommenders || "(не указано)"}

═══════════════════════════════════════════
ДЕМОГРАФИЯ И КОНТЕКСТ:
═══════════════════════════════════════════
${form.demographics || "(не указано)"}

ОГРАНИЧЕНИЯ / СПЕЦ. ОБСТОЯТЕЛЬСТВА:
${form.constraints || "(нет)"}

═══════════════════════════════════════════

ИНСТРУКЦИИ:
1. Прочитай заявку ЦЕЛИКОМ как admission officer
2. Сначала зафиксируй первое впечатление (что бы ты подумал просмотрев один раз)
3. Затем разбери каждый компонент по структуре в системном промпте
4. ЦИТИРУЙ конкретные фразы из эссе/активностей в strengths/concerns
5. Для component scores учитывай context: для top-10 нужно 9-10/10 везде, для top-50 — 7-8/10
6. В Specific edits давай **конкретные text replacements** где возможно ("замени X на Y")
7. Финальный вердикт — реалистичный, основанный на real admit rates`

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "reviewer", user: userPrompt, max_tokens: 10000 }),
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
    a.download = `Review_${form.university.replace(/\s+/g, "_")}_${form.program.replace(/\s+/g, "_")}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Warning banner */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm font-serif text-cream-2">
            <strong className="text-amber-500">Brutally honest review.</strong> AI оценит заявку как реальный admission officer Top-10 / Top-30 / Top-50 уровня. Это значит: критика будет острой, конкретной и без сахара. Цель — найти проблемы ДО отправки, а не похвалить.
          </div>
        </div>

        <Section icon={<ShieldCheck className="h-4 w-4 text-gold" />} title="Target University">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="University" value={form.university} onChange={update("university")} placeholder="Harvard University" required />
            <Field label="Program" value={form.program} onChange={update("program")} placeholder="BS Computer Science" required />
            <SelectField label="Application Round" value={form.round} onChange={update("round")} options={ROUNDS} />
            <Field label="Deadline" value={form.deadline} onChange={update("deadline")} placeholder="1 ноября 2026" />
          </div>
          <div className="mt-4">
            <SelectField label="Уровень строгости review (= уровень target university)" value={form.strictness} onChange={update("strictness")} options={STRICTNESS.map((s) => s.id)} optionLabels={STRICTNESS.map((s) => s.label)} />
          </div>
        </Section>

        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Applicant Profile">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Citizenship" value={form.citizenship} onChange={update("citizenship")} placeholder="Узбекистан" />
            <Field label="Тип школы" value={form.schoolType} onChange={update("schoolType")} placeholder="Public IB / National Lyceum / Private American School" />
            <Field label="GPA" value={form.gpa} onChange={update("gpa")} placeholder="4.95/5 (top 1% of class)" />
            <Field label="Test scores" value={form.tests} onChange={update("tests")} placeholder="SAT 1530, IELTS 8.0" />
          </div>
          <div className="mt-4">
            <FieldArea label="AP / IB / A-level results" value={form.apIb} onChange={update("apIb")} placeholder="AP Calc BC: 5, AP CS A: 5, AP Physics 1: 5, IB Math HL: 7" rows={2} />
          </div>
        </Section>

        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Personal Statement (Common App / UCAS)">
          <FieldArea
            label="Полный текст эссе"
            value={form.personalStatement}
            onChange={update("personalStatement")}
            placeholder="Вставь полный текст основного эссе (Common App: 650 words, UCAS: 4000 chars)..."
            rows={12}
            hint="Без personal statement review будет неполным"
          />
        </Section>

        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Supplemental Essays">
          <div className="space-y-4">
            <FieldArea label="Supplemental Essay 1" value={form.supplemental1} onChange={update("supplemental1")} placeholder='Why this college? / Why this major? / "Tell us about a community you belong to..." (типичный prompt + ваш ответ)' rows={6} />
            <FieldArea label="Supplemental Essay 2" value={form.supplemental2} onChange={update("supplemental2")} placeholder="(если есть второй вопрос)" rows={6} />
            <FieldArea label="Supplemental Essay 3" value={form.supplemental3} onChange={update("supplemental3")} placeholder="(если есть третий вопрос)" rows={6} />
          </div>
        </Section>

        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Extracurricular Activities">
          <FieldArea
            label="Список 10 activities в Common App формате"
            value={form.activities}
            onChange={update("activities")}
            placeholder={`1. Founder & President · School Tech Club (2024-2026, 10 hrs/week, 50 weeks/yr)
   - Organized 4 hackathons attracting 80+ students
   - Mentored 15 juniors; 3 secured paid internships

2. Captain · Math Olympiad Team (2023-2026, 8 hrs/week)
   - Led team to 3rd place at National Olympiad (700+ participants)
   - 1st place at Regional Math Olympiad 2024

3. ...
4. ...
[до 10]`}
            rows={12}
            hint="Common App: position/title · organization · grades · hrs/week · weeks/yr · 2 описания (impact, leadership)"
          />
        </Section>

        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Awards & Honors">
          <FieldArea
            label="5-7 awards (название, уровень, год)"
            value={form.awards}
            onChange={update("awards")}
            placeholder={`1. Bronze Medal, International Math Olympiad (IMO) 2025 — international level
2. National Merit Scholar Finalist 2025 — national level
3. 1st Place, National Coding Olympiad 2024 — national
4. Top-10% Scholarship, Лицей №2 (2023, 2024, 2025) — school level`}
            rows={6}
          />
        </Section>

        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Recommenders">
          <FieldArea
            label="Кто пишет рекомендации + что ожидаешь они напишут"
            value={form.recommenders}
            onChange={update("recommenders")}
            placeholder={`1. Math Teacher (Иван Петров) — знает 2 года, видел Math Olympiad performance, can speak to analytical depth
2. School Counselor (Мария Иванова) — comprehensive overview, top 3% of class
3. CS Mentor (Bob Smith, internship at Acme) — research project supervisor`}
            rows={5}
          />
        </Section>

        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Demographics & Context (опционально, но важно)">
          <div className="space-y-4">
            <FieldArea
              label="Демография: race/ethnicity, first-gen status, financial need, geography"
              value={form.demographics}
              onChange={update("demographics")}
              placeholder="Uzbek, first-gen college student, low-income family, rural Uzbekistan, female in STEM"
              rows={3}
              hint="Это поможет AI учесть holistic admissions"
            />
            <FieldArea
              label="Особые обстоятельства / ограничения"
              value={form.constraints}
              onChange={update("constraints")}
              placeholder="health condition affected GPA in 2024, family responsibility, COVID disruption, etc."
              rows={3}
            />
          </div>
        </Section>

        <Button onClick={review} disabled={loading} className="w-full h-12 bg-gold text-background hover:bg-gold-soft font-cinzel">
          {loading
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> AI читает заявку как admission officer...</>
            : <><ShieldCheck className="h-4 w-4 mr-2" /> Provide brutal honest review</>}
        </Button>

        {result && (
          <div className="rounded-xl border border-border bg-card/40 p-7 accent-strip">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <span className="font-mono-label text-gold">🎯 ADMISSION OFFICER REVIEW</span>
              <div className="flex gap-2">
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

function FieldArea({ label, value, onChange, placeholder, rows = 3, hint }: {
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
