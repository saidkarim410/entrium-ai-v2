import type { ToolKey } from "@/lib/ai/prompts"
import type { ApplicantProfile } from "@/lib/applicant/types"

/**
 * AI Agent Missions — sequential pipelines of specialized tool calls.
 *
 * Each step calls the same /api/chat machinery as a single tool but
 * pre-fills both the system prompt (from SYSTEM_PROMPTS[tool]) and
 * the user-side prompt (constructed below from the applicant profile).
 *
 * The agent runs steps in order, streaming each one's output to the UI
 * before kicking off the next.
 */

export type MissionStep = {
  /** Tool slug routed to /api/chat */
  tool: ToolKey
  /** Section title shown above the streamed output */
  title: string
  /** One-line description of what this step does */
  description: string
  /** Builds the user-side prompt from the applicant profile */
  buildPrompt: (p: ApplicantProfile) => string
}

export type Mission = {
  id: MissionId
  title: string
  subtitle: string
  /** Approx total minutes for the user to read through results */
  duration: string
  /** Lucide icon name (resolved on the client) */
  icon: "Zap" | "Briefcase" | "ShieldCheck" | "Calendar"
  steps: MissionStep[]
}

export type MissionId =
  | "quick-assessment"
  | "full-package"
  | "pre-submission-audit"
  | "year-plan"

// ── Helpers ─────────────────────────────────────────────────────────────────

function profileSnippet(p: ApplicantProfile): string {
  const lines: string[] = []
  if (p.personal.name) lines.push(`Имя: ${p.personal.name}`)
  if (p.personal.age) lines.push(`Возраст: ${p.personal.age}`)
  if (p.personal.citizenship) lines.push(`Гражданство: ${p.personal.citizenship}`)
  if (p.academic.gpa) lines.push(`GPA: ${p.academic.gpa}`)
  if (p.academic.ielts) lines.push(`IELTS: ${p.academic.ielts}`)
  if (p.academic.toefl) lines.push(`TOEFL: ${p.academic.toefl}`)
  if (p.academic.duolingo) lines.push(`Duolingo: ${p.academic.duolingo}`)
  if (p.academic.sat) lines.push(`SAT: ${p.academic.sat}`)
  if (p.academic.act) lines.push(`ACT: ${p.academic.act}`)
  if (p.academic.apIb) lines.push(`AP/IB: ${p.academic.apIb}`)
  if (p.goals.major) lines.push(`Major: ${p.goals.major}`)
  if (p.goals.level) lines.push(`Уровень: ${p.goals.level}`)
  if (p.goals.countries) lines.push(`Страны: ${p.goals.countries}`)
  if (p.goals.targetUnis) lines.push(`Целевые универы: ${p.goals.targetUnis}`)
  if (p.goals.budget) lines.push(`Бюджет: ${p.goals.budget}`)
  if (p.goals.year) lines.push(`Год поступления: ${p.goals.year}`)
  if (p.activities) lines.push(`Активности: ${p.activities.slice(0, 400)}`)
  if (p.awards) lines.push(`Награды: ${p.awards.slice(0, 300)}`)
  if (p.weak) lines.push(`Слабые места: ${p.weak.slice(0, 300)}`)
  if (p.goalsText) lines.push(`Цели: ${p.goalsText.slice(0, 300)}`)
  return lines.length ? lines.join("\n") : "(профиль пустой — дай общие рекомендации)"
}

function firstUni(p: ApplicantProfile): string {
  return (p.goals.targetUnis ?? "").split(",")[0]?.trim() || "топ-30 США"
}

function firstCountry(p: ApplicantProfile): string {
  return (p.goals.countries ?? "").split(",")[0]?.trim() || "США"
}

// ── Missions ────────────────────────────────────────────────────────────────

export const MISSIONS: Mission[] = [
  {
    id: "quick-assessment",
    title: "Быстрая оценка",
    subtitle: "Шансы + что делать сначала",
    duration: "~3 мин",
    icon: "Zap",
    steps: [
      {
        tool: "analyzer",
        title: "Шансы поступления",
        description: "Оцениваю профиль против целевых университетов",
        buildPrompt: (p) =>
          `Проанализируй мои шансы поступления. Профиль:\n\n${profileSnippet(p)}\n\nДай развёрнутую оценку: реалистичные категории (reach/match/safety), процент шансов в каждом, что нужно усилить в первую очередь. Будь конкретен.`,
      },
      {
        tool: "tracker",
        title: "План на 6 месяцев",
        description: "Календарь действий до ближайшего дедлайна",
        buildPrompt: (p) =>
          `На основе моего профиля составь план действий на ближайшие 6 месяцев. Профиль:\n\n${profileSnippet(p)}\n\nФормат: список задач по месяцам с конкретными дедлайнами и приоритетами. Учти поступление в ${p.goals.year ?? "2027"} году.`,
      },
    ],
  },
  {
    id: "full-package",
    title: "Полный admission package",
    subtitle: "Шансы → универы → стипендии → план",
    duration: "~8 мин",
    icon: "Briefcase",
    steps: [
      {
        tool: "analyzer",
        title: "1. Шансы и профиль",
        description: "Реалистичная оценка по категориям",
        buildPrompt: (p) =>
          `Проанализируй мои шансы. Профиль:\n\n${profileSnippet(p)}\n\nДай отчёт: reach/match/safety категории, конкретные числа, ключевые слабости.`,
      },
      {
        tool: "university",
        title: "2. Список университетов",
        description: "Подбор из базы 1500+ универов",
        buildPrompt: (p) =>
          `Подбери 10-15 университетов под мой профиль. Профиль:\n\n${profileSnippet(p)}\n\nРазбей на reach (3-4), match (5-6), safety (3-4). Для каждого: страна, направление, почему подходит, дедлайн, требования.`,
      },
      {
        tool: "scholarship",
        title: "3. Стипендии",
        description: "Стипендии под профиль и страны",
        buildPrompt: (p) =>
          `Подбери стипендии и финансирование под мой профиль. Профиль:\n\n${profileSnippet(p)}\n\nВыдай 8-12 вариантов (государственные, университетские, частные). Для каждого: страна, размер, требования, дедлайн, мои шансы.`,
      },
      {
        tool: "tracker",
        title: "4. Полный план",
        description: "12-месячный roadmap до подачи",
        buildPrompt: (p) =>
          `Составь roadmap на 12 месяцев — от сегодня до подачи документов. Профиль:\n\n${profileSnippet(p)}\n\nФормат: разбивка по месяцам с задачами, дедлайнами, приоритетами. Включи тесты, эссе, рекомендации, заявки, стипендии.`,
      },
    ],
  },
  {
    id: "pre-submission-audit",
    title: "Аудит перед подачей",
    subtitle: "Жёсткий review + экстренный план",
    duration: "~5 мин",
    icon: "ShieldCheck",
    steps: [
      {
        tool: "reviewer",
        title: "Полный review заявки",
        description: "Что admission officer заметит за 7 минут",
        buildPrompt: (p) =>
          `Сделай жёсткий аудит моей заявки в ${firstUni(p)}. Профиль:\n\n${profileSnippet(p)}\n\nПройдись по разделам: Academics, Tests, Activities, Awards, Essays (если есть), Recommendations. Для каждого: оценка от 1 до 10, конкретные слабости, что admission officer заметит. В конце — приоритизированный список того, что критично исправить до дедлайна.`,
      },
      {
        tool: "tracker",
        title: "Экстренный план до дедлайна",
        description: "Действия на финишной прямой",
        buildPrompt: (p) =>
          `Я подаю в ${firstUni(p)} в ближайшие недели. Составь экстренный план — что критично доделать до дедлайна. Профиль:\n\n${profileSnippet(p)}\n\nПриоритизируй задачи: high impact + low time. Дай конкретные дедлайны и checkpoint'ы.`,
      },
    ],
  },
  {
    id: "year-plan",
    title: "План на год",
    subtitle: "Roadmap + бюджет",
    duration: "~5 мин",
    icon: "Calendar",
    steps: [
      {
        tool: "tracker",
        title: "12-месячный roadmap",
        description: "Полный план поступления",
        buildPrompt: (p) =>
          `Составь roadmap на 12 месяцев. Профиль:\n\n${profileSnippet(p)}\n\nРазбей на месяцы. Для каждого: 3-5 ключевых задач, дедлайны, метрики успеха. Включи тесты, эссе, активности, рекомендации, заявки.`,
      },
      {
        tool: "cost",
        title: "Бюджет на обучение",
        description: "Расчёт стоимости + источники финансирования",
        buildPrompt: (p) =>
          `Рассчитай примерную стоимость обучения для меня. Профиль:\n\n${profileSnippet(p)}\n\nПервая страна: ${firstCountry(p)}. Дай: tuition + проживание + дорога + visa + страховка по годам, источники финансирования (стипендии, кредиты, sponsor), реалистичные сценарии full-funded vs partial.`,
      },
    ],
  },
]

export function findMission(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id)
}
