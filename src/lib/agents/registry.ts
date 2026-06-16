import type { Dict } from "@/lib/i18n/dict"
import {
  Target, Sparkles, PencilLine, Wand2, Mic, GraduationCap,
  Award, CalendarRange, FileText, FileUser, Calculator, ShieldCheck, Sun, Languages, ScrollText,
  type LucideIcon,
} from "lucide-react"

// Slugs are exactly the keys present in dict.tools (12). They are a subset of
// ToolKey, so they are valid `tool` values for /api/tg/chat.
export type AgentSlug = keyof Dict["tools"]

export type Agent = {
  slug: AgentSlug
  icon: LucideIcon
  placeholder: string
  isNew?: boolean
  proOnly?: boolean
}

export const AGENTS: Agent[] = [
  { slug: "analyzer", icon: Target, placeholder: "Я хочу в TU Munich и ETH Zurich на бакалавра CS — оцени шансы" },
  { slug: "profile", icon: Sparkles, placeholder: "Расскажи о себе: класс, GPA, тесты, цель" },
  { slug: "essay", icon: PencilLine, placeholder: "Вставь черновик эссе…" },
  { slug: "humanizer", icon: Wand2, placeholder: "Вставь «роботизированный» текст…" },
  { slug: "interview", icon: Mic, placeholder: "Готовлюсь к интервью в Stanford. Начнём?" },
  { slug: "university", icon: GraduationCap, placeholder: "GPA 4.2, IELTS 6.5, бюджет $30k, Data Science — подбери вузы" },
  { slug: "scholarship", icon: Award, placeholder: "Узбекистан, GPA 4.5, магистратура CS в Германии — стипендии" },
  { slug: "tracker", icon: CalendarRange, placeholder: "Подача февраль 2027, 11 класс — составь план" },
  { slug: "recommendation", icon: FileText, placeholder: "Учитель физики — опиши проект ученика для письма" },
  { slug: "cv", icon: FileUser, placeholder: "Сделай CV для admissions: опыт, проекты, награды" },
  { slug: "cost", icon: Calculator, placeholder: "Сколько стоит учёба в Канаде и как снизить расходы?" },
  { slug: "reviewer", icon: ShieldCheck, placeholder: "Проверь мою заявку перед подачей — будь строгим" },
  { slug: "summer", icon: Sun, placeholder: "9 класс, интересуюсь биологией, бюджет до $3000, лето 2027 — что посоветуешь?", isNew: true },
  { slug: "speaking", icon: Languages, placeholder: "Запиши или впиши свой ответ на английском — разберу по IELTS", isNew: true },
  { slug: "research", icon: ScrollText, placeholder: "Пишу диплом по политологии, нужна помощь с введением и методологией", isNew: true },
]

export function findAgent(slug: string): Agent | undefined {
  return AGENTS.find((a) => a.slug === slug)
}
