"use client"

import { useEffect, useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveApplicantProfile } from "@/lib/applicant/actions"
import { profileCompleteness, type ApplicantProfile } from "@/lib/applicant/types"
import { DocumentUploadCard, mergeProfilePatch } from "@/components/document-upload-card"
import { VoiceInputButton } from "@/components/voice-input-button"
import { User, GraduationCap, Target, Trophy, Loader2, Check, Sparkles } from "lucide-react"

const LEVELS = ["Bachelor", "Master", "PhD", "MBA", "Foundation"] as const

export function ProfileSettings({
  initial,
  telegramSlot,
  shareSlot,
  emailSlot,
  notificationSlot,
}: {
  initial: ApplicantProfile
  telegramSlot?: React.ReactNode
  shareSlot?: React.ReactNode
  emailSlot?: React.ReactNode
  notificationSlot?: React.ReactNode
}) {
  const [profile, setProfile] = useState<ApplicantProfile>(initial)
  const [pending, startTransition] = useTransition()
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [justSaved, setJustSaved] = useState(false)

  // Flip "Сохранено" badge for 3s after each successful save, then revert
  useEffect(() => {
    if (savedAt === null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJustSaved(true)
    const handle = setTimeout(() => setJustSaved(false), 3000)
    return () => clearTimeout(handle)
  }, [savedAt])

  const completeness = profileCompleteness(profile)

  function update<K extends keyof ApplicantProfile>(section: K, key: keyof NonNullable<ApplicantProfile[K]>, value: string) {
    setProfile((p) => ({
      ...p,
      [section]: {
        ...(p[section] as Record<string, unknown>),
        [key]: value,
      },
    }))
  }

  function updateField(key: keyof ApplicantProfile, value: string) {
    setProfile((p) => ({ ...p, [key]: value }))
  }

  function save() {
    startTransition(async () => {
      const r = await saveApplicantProfile(profile)
      if (r.ok) {
        toast.success("Профиль сохранён · теперь autofill во всех инструментах")
        setSavedAt(Date.now())
      } else {
        toast.error(r.error ?? "Не удалось сохранить")
      }
    })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Progress bar */}
        <div className="rounded-xl border border-border bg-card/40 p-5 accent-strip">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono-label text-cream-3">Заполненность профиля</span>
            <span className="font-display text-2xl text-gold">{completeness}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gold transition-all"
              style={{ width: `${completeness}%` }}
            />
          </div>
          <p className="mt-3 text-sm font-serif text-cream-3">
            {completeness < 50
              ? "Заполни хотя бы основные поля чтобы AI давал точные рекомендации"
              : completeness < 100
                ? "Хорошо! Чем подробнее — тем лучше работают AI-инструменты"
                : "Отлично! Профиль полный — AI получит максимум контекста"}
          </p>
        </div>

        {/* Document upload */}
        <DocumentUploadCard onApply={(patch) => setProfile((p) => mergeProfilePatch(p, patch))} />

        {shareSlot}
        {notificationSlot}
        {telegramSlot}
        {emailSlot}

        {/* Personal */}
        <Section icon={<User className="h-4 w-4 text-gold" />} title="Личные данные">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Полное имя" value={profile.personal.name ?? ""} onChange={(v) => update("personal", "name", v)} placeholder="Saidkarim Tursunbaev" />
            <Field label="Возраст" value={profile.personal.age ?? ""} onChange={(v) => update("personal", "age", v)} placeholder="17" />
            <Field label="Гражданство" value={profile.personal.citizenship ?? ""} onChange={(v) => update("personal", "citizenship", v)} placeholder="Узбекистан" />
            <Field label="Город / страна" value={profile.personal.location ?? ""} onChange={(v) => update("personal", "location", v)} placeholder="Tashkent, Uzbekistan" />
            <Field label="Email" value={profile.personal.email ?? ""} onChange={(v) => update("personal", "email", v)} placeholder="you@example.com" />
            <Field label="Телефон" value={profile.personal.phone ?? ""} onChange={(v) => update("personal", "phone", v)} placeholder="+998 99 205 00 50" />
            <Field label="LinkedIn" value={profile.personal.linkedin ?? ""} onChange={(v) => update("personal", "linkedin", v)} placeholder="linkedin.com/in/saidkarim" />
            <Field label="GitHub" value={profile.personal.github ?? ""} onChange={(v) => update("personal", "github", v)} placeholder="github.com/saidkarim410" />
            <Field label="Portfolio (опц)" value={profile.personal.portfolio ?? ""} onChange={(v) => update("personal", "portfolio", v)} placeholder="entrium.ai" />
          </div>
        </Section>

        {/* Academic */}
        <Section icon={<GraduationCap className="h-4 w-4 text-gold" />} title="Академический профиль">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Школа / университет" value={profile.academic.school ?? ""} onChange={(v) => update("academic", "school", v)} placeholder="Лицей №2, Tashkent" />
            <Field label="Тип школы" value={profile.academic.schoolType ?? ""} onChange={(v) => update("academic", "schoolType", v)} placeholder="IB / A-level / National / American" />
            <Field label="GPA" value={profile.academic.gpa ?? ""} onChange={(v) => update("academic", "gpa", v)} placeholder="4.5/5 (top 5% of class)" />
            <Field label="SAT" value={profile.academic.sat ?? ""} onChange={(v) => update("academic", "sat", v)} placeholder="1450" />
            <Field label="ACT" value={profile.academic.act ?? ""} onChange={(v) => update("academic", "act", v)} placeholder="32" />
            <Field label="IELTS" value={profile.academic.ielts ?? ""} onChange={(v) => update("academic", "ielts", v)} placeholder="7.5" />
            <Field label="TOEFL" value={profile.academic.toefl ?? ""} onChange={(v) => update("academic", "toefl", v)} placeholder="105" />
            <Field label="Duolingo English" value={profile.academic.duolingo ?? ""} onChange={(v) => update("academic", "duolingo", v)} placeholder="135" />
          </div>
          <div className="mt-4">
            <FieldArea label="AP / IB / A-level scores" value={profile.academic.apIb ?? ""} onChange={(v) => update("academic", "apIb", v)} placeholder="AP Calc BC: 5, AP CS A: 5, AP Physics 1: 5" rows={2} />
          </div>
          <div className="mt-4">
            <FieldArea label="Дополнительные курсы / coursework" value={profile.academic.coursework ?? ""} onChange={(v) => update("academic", "coursework", v)} placeholder="Calculus II, Linear Algebra, ML on Coursera" rows={2} />
          </div>
        </Section>

        {/* Goals */}
        <Section icon={<Target className="h-4 w-4 text-gold" />} title="Цели поступления">
          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField label="Уровень" value={profile.goals.level ?? "Bachelor"} onChange={(v) => update("goals", "level", v)} options={LEVELS} />
            <Field label="Год поступления" value={profile.goals.year ?? ""} onChange={(v) => update("goals", "year", v)} placeholder="2027" />
            <Field label="Специальность" value={profile.goals.major ?? ""} onChange={(v) => update("goals", "major", v)} placeholder="Computer Science" />
            <Field label="Регион" value={profile.goals.region ?? ""} onChange={(v) => update("goals", "region", v)} placeholder="USA / UK / EU / Asia / Mixed" />
            <Field label="Целевые страны" value={profile.goals.countries ?? ""} onChange={(v) => update("goals", "countries", v)} placeholder="USA, UK, Germany" />
            <Field label="Бюджет $/год" value={profile.goals.budget ?? ""} onChange={(v) => update("goals", "budget", v)} placeholder="20000" />
          </div>
          <div className="mt-4">
            <FieldArea label="Целевые университеты" value={profile.goals.targetUnis ?? ""} onChange={(v) => update("goals", "targetUnis", v)} placeholder="MIT, Stanford, ETH Zurich, NUS, Cambridge, TU Munich" rows={2} />
          </div>
        </Section>

        {/* Experience & Activities */}
        <Section icon={<Trophy className="h-4 w-4 text-gold" />} title="Опыт, активности, достижения">
          <FieldArea
            label="Опыт работы / стажировки"
            value={profile.experience ?? ""}
            onChange={(v) => updateField("experience", v)}
            placeholder={`Software Engineering Intern · Acme Tech (Jun-Aug 2024)
- built API for chat product
- worked on backend in Python`}
            rows={5}
          />
          <FieldArea
            label="Внеклассная активность"
            value={profile.activities ?? ""}
            onChange={(v) => updateField("activities", v)}
            placeholder={`School Tech Club President (2024-2025) — organized 4 hackathons for 80+ participants
Volunteer Math Tutor — taught 12 underprivileged students`}
            rows={5}
          />
          <FieldArea
            label="Награды / достижения"
            value={profile.awards ?? ""}
            onChange={(v) => updateField("awards", v)}
            placeholder={`3rd place, National Math Olympiad 2025 (out of 700 participants)
Top-10% scholarship, Лицей №2`}
            rows={4}
          />
          <FieldArea
            label="Проекты"
            value={profile.projects ?? ""}
            onChange={(v) => updateField("projects", v)}
            placeholder="Entrium AI · Next.js, Supabase, Claude API · 200+ active users · github.com/saidkarim410/entrium-ai-v2"
            rows={3}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldArea
              label="Технические скиллы"
              value={profile.skillsTech ?? ""}
              onChange={(v) => updateField("skillsTech", v)}
              placeholder="Python, TypeScript, React, PostgreSQL, Docker"
              rows={3}
            />
            <FieldArea
              label="Языки"
              value={profile.skillsLang ?? ""}
              onChange={(v) => updateField("skillsLang", v)}
              placeholder="Russian — Native · English — IELTS 7.5 (C1) · Uzbek — Native"
              rows={3}
            />
          </div>
        </Section>

        {/* Self-reflection */}
        <Section icon={<Sparkles className="h-4 w-4 text-gold" />} title="Self-reflection (для AI)">
          <FieldArea
            label="Слабые места (своё мнение)"
            value={profile.weak ?? ""}
            onChange={(v) => updateField("weak", v)}
            placeholder="низкий SAT, нет рекомендаций, мало активности"
            rows={3}
          />
          <FieldArea
            label="Цели и мотивация"
            value={profile.goalsText ?? ""}
            onChange={(v) => updateField("goalsText", v)}
            placeholder="Хочу стать AI-researcher и вернуться построить tech-экосистему в Узбекистане"
            rows={3}
          />
        </Section>

        <div className="sticky bottom-4 pt-4">
          <Button
            onClick={save}
            disabled={pending}
            className="w-full h-12 bg-gold text-background hover:bg-gold-soft font-cinzel shadow-lg"
          >
            {pending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Сохраняем...</>
            ) : justSaved ? (
              <><Check className="h-4 w-4 mr-2" /> Сохранено</>
            ) : (
              <><Check className="h-4 w-4 mr-2" /> Сохранить профиль</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-6 accent-strip space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-mono-label text-cream-3">{title}</span>
      </div>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function FieldArea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="font-mono-label text-cream-3">{label}</Label>
        <VoiceInputButton
          size="sm"
          hint={label}
          onTranscript={(text) =>
            onChange(value.trim() ? `${value.trim()} ${text}` : text)
          }
        />
      </div>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="font-serif" />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-cream">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
