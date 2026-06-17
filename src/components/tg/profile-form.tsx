"use client"

import { useEffect, useState } from "react"
import { useTelegram } from "@/lib/telegram/webapp"
import type { ApplicantProfile } from "@/lib/applicant/types"
import { normalizeApplicantProfile } from "@/lib/applicant/types"

type SaveState = "idle" | "saving" | "saved" | "error"

export function ProfileForm() {
  const { initData, ready } = useTelegram()

  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Загрузка…</div>
  if (!initData)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Открой это приложение через бота <b>@entriumcouselorbot</b>.
      </div>
    )

  return <ProfileFormInner initData={initData} />
}

function ProfileFormInner({ initData }: { initData: string }) {
  const [profile, setProfile] = useState<ApplicantProfile>(normalizeApplicantProfile(null))
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  // Prefill from server on mount
  useEffect(() => {
    fetch("/api/tg/profile", {
      headers: { "x-telegram-init-data": initData },
    })
      .then((r) => r.json())
      .then((body: { profile?: unknown }) => {
        if (body.profile) setProfile(normalizeApplicantProfile(body.profile))
      })
      .catch(() => {/* silently ignore — form stays empty */})
  }, [initData])

  function setPersonal(field: keyof ApplicantProfile["personal"], value: string) {
    setProfile((p) => ({ ...p, personal: { ...p.personal, [field]: value } }))
  }
  function setAcademic(field: keyof ApplicantProfile["academic"], value: string) {
    setProfile((p) => ({ ...p, academic: { ...p.academic, [field]: value } }))
  }
  function setGoals(field: keyof ApplicantProfile["goals"], value: string) {
    setProfile((p) => ({ ...p, goals: { ...p.goals, [field]: value } }))
  }
  function setFlat(field: "activities" | "goalsText", value: string) {
    setProfile((p) => ({ ...p, [field]: value }))
  }

  async function handleSave() {
    setSaveState("saving")
    setErrorMsg("")
    try {
      const res = await fetch("/api/tg/profile", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-init-data": initData,
        },
        body: JSON.stringify(profile),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }
      setSaveState("saved")
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Неизвестная ошибка")
      setSaveState("error")
    }
  }

  const inputClass = "w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--brand-red)]"
  const labelClass = "block text-xs text-muted-foreground mb-1"
  const sectionClass = "font-mono-label mb-2 mt-5 text-[10px] tracking-widest text-[var(--brand-red)] uppercase"

  return (
    <div className="flex flex-col px-4 pb-28 pt-4">
      {/* ── Личное ── */}
      <p className={sectionClass}>Личное</p>

      <div className="mb-3">
        <label className={labelClass}>Имя</label>
        <input
          className={inputClass}
          value={profile.personal.name ?? ""}
          onChange={(e) => setPersonal("name", e.target.value)}
          placeholder="Полное имя"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>Возраст</label>
        <input
          className={inputClass}
          type="number"
          min={10}
          max={60}
          value={profile.personal.age ?? ""}
          onChange={(e) => setPersonal("age", e.target.value)}
          placeholder="17"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>Гражданство</label>
        <input
          className={inputClass}
          value={profile.personal.citizenship ?? ""}
          onChange={(e) => setPersonal("citizenship", e.target.value)}
          placeholder="Узбекистан"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>Город</label>
        <input
          className={inputClass}
          value={profile.personal.location ?? ""}
          onChange={(e) => setPersonal("location", e.target.value)}
          placeholder="Ташкент"
        />
      </div>

      {/* ── Академика ── */}
      <p className={sectionClass}>Академика</p>

      <div className="mb-3">
        <label className={labelClass}>Школа / вуз</label>
        <input
          className={inputClass}
          value={profile.academic.school ?? ""}
          onChange={(e) => setAcademic("school", e.target.value)}
          placeholder="Westminster International University"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>GPA</label>
        <input
          className={inputClass}
          value={profile.academic.gpa ?? ""}
          onChange={(e) => setAcademic("gpa", e.target.value)}
          placeholder="3.8 / 4.0"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>IELTS</label>
        <input
          className={inputClass}
          value={profile.academic.ielts ?? ""}
          onChange={(e) => setAcademic("ielts", e.target.value)}
          placeholder="7.0"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>TOEFL</label>
        <input
          className={inputClass}
          value={profile.academic.toefl ?? ""}
          onChange={(e) => setAcademic("toefl", e.target.value)}
          placeholder="100"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>SAT</label>
        <input
          className={inputClass}
          value={profile.academic.sat ?? ""}
          onChange={(e) => setAcademic("sat", e.target.value)}
          placeholder="1400"
        />
      </div>

      {/* ── Цели ── */}
      <p className={sectionClass}>Цели</p>

      <div className="mb-3">
        <label className={labelClass}>Уровень</label>
        <select
          className={inputClass}
          value={profile.goals.level ?? ""}
          onChange={(e) =>
            setGoals("level", e.target.value as ApplicantProfile["goals"]["level"] & string)
          }
        >
          <option value="">— выбери —</option>
          <option value="Bachelor">Bachelor</option>
          <option value="Master">Master</option>
          <option value="PhD">PhD</option>
          <option value="MBA">MBA</option>
          <option value="Foundation">Foundation</option>
        </select>
      </div>

      <div className="mb-3">
        <label className={labelClass}>Год поступления</label>
        <input
          className={inputClass}
          value={profile.goals.year ?? ""}
          onChange={(e) => setGoals("year", e.target.value)}
          placeholder="2026"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>Специальность</label>
        <input
          className={inputClass}
          value={profile.goals.major ?? ""}
          onChange={(e) => setGoals("major", e.target.value)}
          placeholder="Computer Science"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>Страны</label>
        <input
          className={inputClass}
          value={profile.goals.countries ?? ""}
          onChange={(e) => setGoals("countries", e.target.value)}
          placeholder="USA, UK, Germany"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>Целевые вузы</label>
        <input
          className={inputClass}
          value={profile.goals.targetUnis ?? ""}
          onChange={(e) => setGoals("targetUnis", e.target.value)}
          placeholder="MIT, Stanford, Cambridge"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>Бюджет $/год</label>
        <input
          className={inputClass}
          value={profile.goals.budget ?? ""}
          onChange={(e) => setGoals("budget", e.target.value)}
          placeholder="30000"
        />
      </div>

      {/* ── Доп ── */}
      <p className={sectionClass}>Доп. информация</p>

      <div className="mb-3">
        <label className={labelClass}>Активности и достижения</label>
        <textarea
          className={inputClass}
          rows={3}
          value={profile.activities ?? ""}
          onChange={(e) => setFlat("activities", e.target.value)}
          placeholder="Олимпиады, волонтёрство, спорт…"
        />
      </div>

      <div className="mb-3">
        <label className={labelClass}>О себе и целях</label>
        <textarea
          className={inputClass}
          rows={4}
          value={profile.goalsText ?? ""}
          onChange={(e) => setFlat("goalsText", e.target.value)}
          placeholder="Почему хочешь учиться за рубежом? Что хочешь достичь?"
        />
      </div>

      {/* Sticky Save button */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4">
        {saveState === "saved" && (
          <p className="mb-2 text-center text-xs text-green-500">
            Сохранено ✓ — теперь агенты учитывают твои данные
          </p>
        )}
        {saveState === "error" && (
          <p className="mb-2 text-center text-xs text-destructive">{errorMsg || "Ошибка при сохранении"}</p>
        )}
        <button
          type="button"
          disabled={saveState === "saving"}
          onClick={() => void handleSave()}
          className="w-full rounded-xl bg-[var(--brand-red)] py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saveState === "saving" ? "Сохраняю…" : "Сохранить"}
        </button>
      </div>
    </div>
  )
}
