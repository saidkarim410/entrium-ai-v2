"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { saveApplicantProfile, saveOnboardingProgress } from "@/lib/applicant/actions"
import { type ApplicantProfile } from "@/lib/applicant/types"
import {
  Sparkles, ArrowRight, ArrowLeft, Loader2, Check,
  User, Target, GraduationCap, Trophy, Cloud,
} from "lucide-react"
import { cn } from "@/lib/utils"

const TOTAL_STEPS = 5
const STEP_LABELS = ["Знакомство", "Академика", "Цели", "Опыт", "Готово"] as const

type AutosaveState = "idle" | "saving" | "saved" | "error"

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  telegram: "Telegram",
  yandex: "Yandex",
  whatsapp: "WhatsApp",
  email: "email",
  phone: "телефону",
}

export function OnboardingWizard({
  initial,
  autofilled = [],
  source = null,
}: {
  initial: ApplicantProfile
  autofilled?: string[]
  source?: string | null
}) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<ApplicantProfile>(initial)
  const autofilledSet = new Set(autofilled)
  const sourceLabel = source ? PROVIDER_LABEL[source] ?? source : null
  const [pending, startTransition] = useTransition()
  const [autosave, setAutosave] = useState<AutosaveState>("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRenderRef = useRef(true)

  // Debounced autosave on every profile mutation. Skips first render so we
  // don't pointlessly save the initial state. 1s debounce — small enough that
  // a refresh mid-typing only loses a sentence.
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setAutosave("saving")
      const r = await saveOnboardingProgress(profile)
      setAutosave(r.ok ? "saved" : "error")
      if (r.ok) {
        setTimeout(() => setAutosave((s) => (s === "saved" ? "idle" : s)), 2000)
      }
    }, 1000)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [profile])

  // Force-save before step transition so even if the user closes the tab
  // immediately after clicking "Next" their progress is durable
  async function flushSave() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    setAutosave("saving")
    const r = await saveOnboardingProgress(profile)
    setAutosave(r.ok ? "saved" : "error")
  }

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

  async function next() {
    await flushSave()
    if (step < TOTAL_STEPS) setStep(step + 1)
    else finish()
  }

  async function back() {
    await flushSave()
    if (step > 1) setStep(step - 1)
  }

  function finish() {
    startTransition(async () => {
      const r = await saveApplicantProfile(profile)
      if (r.ok) {
        toast.success("Профиль сохранён · теперь все AI-инструменты автозаполняются")
        router.push("/dashboard")
        router.refresh()
      } else {
        toast.error(r.error ?? "Не удалось сохранить")
      }
    })
  }

  function skipAll() {
    startTransition(async () => {
      // Mark as completed even with empty data so user can skip onboarding
      const r = await saveApplicantProfile(profile)
      if (r.ok) {
        router.push("/dashboard")
        router.refresh()
      }
    })
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Autosave status — fixed top-right */}
      <div className="fixed top-3 right-4 z-30">
        <AutosaveBadge state={autosave} />
      </div>

      <div className="container max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gold text-background font-display font-bold">E</span>
            <span className="font-display text-xl">Entrium AI</span>
          </div>
          <h1 className="font-display text-3xl mb-2">Заполни профиль один раз</h1>
          <p className="font-serif text-cream-2">
            Все 11 AI-инструментов будут автозаполняться. Это занимает 2 минуты ·
            <span className="text-cream-3"> прогресс автосохраняется</span>
          </p>
        </div>

        {/* U-5 (TZ): step indicator with labels.
            Was: thin progress bar with just "step/total" — easy to lose
            orientation if user closes tab and returns.
            Now: numbered circles + labels per step, completed steps get
            a checkmark, current step is highlighted, the active step's
            label is bold so it's visually anchored. */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center justify-between gap-1 sm:gap-2 mb-3">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1
              const isComplete = stepNum < step
              const isCurrent = stepNum === step
              return (
                <div key={i} className="flex-1 flex items-center min-w-0">
                  <div className="flex flex-col items-center gap-1.5 min-w-0">
                    <div
                      className={cn(
                        "grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full border-2 font-display text-xs sm:text-sm shrink-0 transition-all",
                        isComplete && "border-gold bg-gold text-background",
                        isCurrent && "border-gold text-gold bg-gold/10",
                        !isComplete && !isCurrent && "border-border text-cream-3 bg-card/40",
                      )}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {isComplete ? "✓" : stepNum}
                    </div>
                    <span
                      className={cn(
                        "font-mono-label text-[9px] sm:text-[10px] uppercase tracking-wider truncate w-full text-center",
                        isCurrent ? "text-gold font-bold" : isComplete ? "text-cream-2" : "text-cream-3",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < TOTAL_STEPS - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-1 sm:mx-2 -mt-4 transition-colors",
                        stepNum < step ? "bg-gold" : "bg-border",
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <p className="font-mono-label text-[10px] text-cream-3 text-center">
            Шаг {step} из {TOTAL_STEPS} · прогресс автосохраняется
          </p>
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <Card icon={<Sparkles className="h-5 w-5 text-gold" />}>
            <h2 className="font-display text-2xl mb-3">Знакомство</h2>
            <p className="font-serif text-cream-2 mb-6">
              Расскажи кто ты — это поможет AI настроить рекомендации под твой контекст.
            </p>
            {autofilledSet.size > 0 && sourceLabel && (
              <div className="mb-5 rounded-lg border border-[var(--brand-red)]/30 bg-[var(--brand-red-soft)] px-4 py-3 flex items-start gap-2">
                <Check className="h-4 w-4 text-[var(--brand-red)] mt-0.5 shrink-0" />
                <p className="font-serif text-sm text-foreground">
                  Подставили данные из <strong>{sourceLabel}</strong> — проверь и заполни остальное.
                </p>
              </div>
            )}
            <div className="space-y-4">
              <Field
                label="Полное имя"
                value={profile.personal.name ?? ""}
                onChange={(v) => update("personal", "name", v)}
                placeholder="Saidkarim Tursunbaev"
                autofilled={autofilledSet.has("personal.name")}
                sourceLabel={sourceLabel}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Возраст"
                  value={profile.personal.age ?? ""}
                  onChange={(v) => update("personal", "age", v)}
                  placeholder="17"
                  autofilled={autofilledSet.has("personal.age")}
                  sourceLabel={sourceLabel}
                />
                <Field
                  label="Гражданство"
                  value={profile.personal.citizenship ?? ""}
                  onChange={(v) => update("personal", "citizenship", v)}
                  placeholder="Узбекистан"
                />
              </div>
              <Field
                label="Город / страна"
                value={profile.personal.location ?? ""}
                onChange={(v) => update("personal", "location", v)}
                placeholder="Tashkent, Uzbekistan"
                autofilled={autofilledSet.has("personal.location")}
                sourceLabel={sourceLabel}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="Email"
                  value={profile.personal.email ?? ""}
                  onChange={(v) => update("personal", "email", v)}
                  placeholder="you@example.com"
                  autofilled={autofilledSet.has("personal.email")}
                  sourceLabel={sourceLabel}
                />
                <Field
                  label="Телефон"
                  value={profile.personal.phone ?? ""}
                  onChange={(v) => update("personal", "phone", v)}
                  placeholder="+998 90 ..."
                  autofilled={autofilledSet.has("personal.phone")}
                  sourceLabel={sourceLabel}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: Goals */}
        {step === 2 && (
          <Card icon={<Target className="h-5 w-5 text-gold" />}>
            <h2 className="font-display text-2xl mb-3">Цели поступления</h2>
            <p className="font-serif text-cream-2 mb-6">
              Куда хочешь поступать — без этого AI не сможет дать релевантные рекомендации.
            </p>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <SelectField
                  label="Уровень"
                  value={profile.goals.level ?? "Bachelor"}
                  onChange={(v) => update("goals", "level", v)}
                  options={["Bachelor", "Master", "PhD", "MBA", "Foundation"] as const}
                />
                <Field
                  label="Год поступления"
                  value={profile.goals.year ?? ""}
                  onChange={(v) => update("goals", "year", v)}
                  placeholder="2027"
                />
              </div>
              <Field
                label="Специальность"
                value={profile.goals.major ?? ""}
                onChange={(v) => update("goals", "major", v)}
                placeholder="Computer Science · Business · Medicine"
              />
              <Field
                label="Целевые страны"
                value={profile.goals.countries ?? ""}
                onChange={(v) => update("goals", "countries", v)}
                placeholder="USA, UK, Germany"
              />
              <Textarea
                value={profile.goals.targetUnis ?? ""}
                onChange={(e) => update("goals", "targetUnis", e.target.value)}
                placeholder="MIT, Stanford, ETH Zurich, NUS, Cambridge"
                rows={2}
                className="font-serif"
              />
              <Label className="font-mono-label text-cream-3">↑ Целевые университеты (через запятую)</Label>
              <Field
                label="Бюджет $/год"
                value={profile.goals.budget ?? ""}
                onChange={(v) => update("goals", "budget", v)}
                placeholder="20000"
              />
            </div>
          </Card>
        )}

        {/* Step 3: Academic */}
        {step === 3 && (
          <Card icon={<GraduationCap className="h-5 w-5 text-gold" />}>
            <h2 className="font-display text-2xl mb-3">Академический профиль</h2>
            <p className="font-serif text-cream-2 mb-6">
              GPA + тесты — основа для оценки шансов. Если что-то ещё не сдавал, оставь пустым.
            </p>
            <div className="space-y-4">
              <Field
                label="Школа / университет"
                value={profile.academic.school ?? ""}
                onChange={(v) => update("academic", "school", v)}
                placeholder="Лицей №2, Tashkent"
                autofilled={autofilledSet.has("academic.school")}
                sourceLabel={sourceLabel}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Field
                  label="GPA"
                  value={profile.academic.gpa ?? ""}
                  onChange={(v) => update("academic", "gpa", v)}
                  placeholder="4.5/5 или 3.8/4.0"
                />
                <Field
                  label="SAT"
                  value={profile.academic.sat ?? ""}
                  onChange={(v) => update("academic", "sat", v)}
                  placeholder="1450"
                />
                <Field
                  label="IELTS"
                  value={profile.academic.ielts ?? ""}
                  onChange={(v) => update("academic", "ielts", v)}
                  placeholder="7.5"
                />
                <Field
                  label="TOEFL"
                  value={profile.academic.toefl ?? ""}
                  onChange={(v) => update("academic", "toefl", v)}
                  placeholder="105"
                />
              </div>
              <Textarea
                value={profile.academic.apIb ?? ""}
                onChange={(e) => update("academic", "apIb", e.target.value)}
                placeholder="AP Calc BC: 5, AP CS A: 5, AP Physics: 4"
                rows={2}
                className="font-serif"
              />
              <Label className="font-mono-label text-cream-3">↑ AP / IB / A-level scores (если есть)</Label>
            </div>
          </Card>
        )}

        {/* Step 4: Activities */}
        {step === 4 && (
          <Card icon={<Trophy className="h-5 w-5 text-gold" />}>
            <h2 className="font-display text-2xl mb-3">Активности и достижения</h2>
            <p className="font-serif text-cream-2 mb-6">
              Что у тебя за пределами оценок? Это самое важное для top-вузов.
            </p>
            <div className="space-y-4">
              <div>
                <Label className="font-mono-label text-cream-3">Внеклассная активность</Label>
                <Textarea
                  value={profile.activities ?? ""}
                  onChange={(e) => updateField("activities", e.target.value)}
                  placeholder="Tech Club President · Math Olympiad team · Volunteer tutoring 12 students"
                  rows={4}
                  className="font-serif mt-1.5"
                />
              </div>
              <div>
                <Label className="font-mono-label text-cream-3">Награды / достижения</Label>
                <Textarea
                  value={profile.awards ?? ""}
                  onChange={(e) => updateField("awards", e.target.value)}
                  placeholder="3rd place National Math Olympiad 2025 · Top-10% scholarship"
                  rows={3}
                  className="font-serif mt-1.5"
                />
              </div>
              <div>
                <Label className="font-mono-label text-cream-3">Опыт работы / стажировки</Label>
                <Textarea
                  value={profile.experience ?? ""}
                  onChange={(e) => updateField("experience", e.target.value)}
                  placeholder="Software Engineering Intern · Acme Tech · Jun-Aug 2024"
                  rows={3}
                  className="font-serif mt-1.5"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Step 5: Final */}
        {step === 5 && (
          <Card icon={<User className="h-5 w-5 text-gold" />}>
            <h2 className="font-display text-2xl mb-3">Self-reflection</h2>
            <p className="font-serif text-cream-2 mb-6">
              Что переживаешь? AI учтёт это когда даёт рекомендации.
            </p>
            <div className="space-y-4">
              <div>
                <Label className="font-mono-label text-cream-3">Слабые места (своё мнение)</Label>
                <Textarea
                  value={profile.weak ?? ""}
                  onChange={(e) => updateField("weak", e.target.value)}
                  placeholder="низкий SAT, нет рекомендаций, бюджет ограничен"
                  rows={3}
                  className="font-serif mt-1.5"
                />
              </div>
              <div>
                <Label className="font-mono-label text-cream-3">Цели и мотивация</Label>
                <Textarea
                  value={profile.goalsText ?? ""}
                  onChange={(e) => updateField("goalsText", e.target.value)}
                  placeholder="Хочу стать AI-researcher. Думаю про startup в области образования. Готов работать part-time во время учёбы."
                  rows={4}
                  className="font-serif mt-1.5"
                />
              </div>
              <div className="rounded-lg bg-gold/10 border border-gold/30 p-4 mt-6">
                <p className="font-serif text-sm text-cream">
                  ✨ <strong>Готово!</strong> После сохранения откроется dashboard. Ты можешь дозаполнить профиль в <code className="bg-card px-1.5 py-0.5 rounded text-xs">/settings</code> в любое время.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <Button
            onClick={back}
            disabled={step === 1 || pending}
            variant="ghost"
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Назад
          </Button>

          <button
            onClick={skipAll}
            disabled={pending}
            className="text-sm text-cream-3 hover:text-cream transition-colors"
          >
            Пропустить пока
          </button>

          <Button
            onClick={next}
            disabled={pending}
            className="gap-2 bg-gold text-background hover:bg-gold-soft font-cinzel"
          >
            {pending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Сохраняем...</>
            ) : step === TOTAL_STEPS ? (
              <><Check className="h-4 w-4" /> Завершить</>
            ) : (
              <>Далее <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Card({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-7 accent-strip">
      <div className="mb-4">{icon}</div>
      {children}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autofilled,
  sourceLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autofilled?: boolean
  sourceLabel?: string | null
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="font-mono-label text-cream-3">{label}</Label>
        {autofilled && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-red-soft)] px-2 py-0.5 text-[9px] font-mono-label uppercase tracking-wider text-[var(--brand-red)]">
            <Check className="h-2.5 w-2.5" />
            {sourceLabel ? `из ${sourceLabel}` : "auto"}
          </span>
        )}
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

function SelectField<T extends string>({ label, value, onChange, options }: { label: string; value: string; onChange: (v: T) => void; options: readonly T[] }) {
  return (
    <div className="space-y-1.5">
      <Label className="font-mono-label text-cream-3">{label}</Label>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="flex h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-cream">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function AutosaveBadge({ state }: { state: AutosaveState }) {
  if (state === "idle") return null

  const cls =
    state === "saving"
      ? "bg-cream-3/15 border-cream-3/30 text-cream-2"
      : state === "saved"
        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
        : "bg-rose-500/15 border-rose-500/30 text-rose-300"

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono-label",
      "backdrop-blur transition-all",
      cls,
    )}>
      {state === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
      {state === "saved" && <Cloud className="h-3 w-3" />}
      {state === "error" && <Cloud className="h-3 w-3" />}
      {state === "saving" && "Сохраняю..."}
      {state === "saved" && "Сохранено"}
      {state === "error" && "Не удалось сохранить"}
    </div>
  )
}
