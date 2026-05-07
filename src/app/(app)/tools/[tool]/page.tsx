import { notFound } from "next/navigation"
import { ToolChat } from "./tool-chat"

const tools = {
  profile: {
    name: "Диагностика профиля",
    description: "Расскажи о себе — AI оценит академический уровень и готовность к поступлению",
    placeholder: "Например: «Я закончил школу в Ташкенте с GPA 4.5, сдал IELTS 7.0, хочу поступать на CS в Европе»",
  },
  analyzer: {
    name: "Анализ шансов поступления",
    description: "Назови университеты — AI оценит твои шансы и что нужно усилить",
    placeholder: "Я хочу поступить в TU Munich, ETH Zurich и University of Edinburgh на бакалавра CS",
  },
  tracker: {
    name: "Персональный план",
    description: "AI составит roadmap по неделям до подачи документов",
    placeholder: "Подача в феврале 2027, я в 11 классе, нужно подготовить тесты, эссе, рекомендации",
  },
  university: {
    name: "Подбор университетов",
    description: "AI подберёт safety/target/reach из базы 1500+ универов",
    placeholder: "GPA 4.2, IELTS 6.5, бюджет до $30k/год, специальность Data Science, страна — любая",
  },
  scholarship: {
    name: "Подбор стипендий",
    description: "Match-калькулятор по требованиям 300+ программ",
    placeholder: "Гражданство Узбекистан, GPA 4.5, целевая страна Германия, магистратура CS",
  },
  essay: {
    name: "Essay Coach",
    description: "Вставь черновик эссе — AI разберёт структуру, аргументацию и язык",
    placeholder: "Вставь сюда текст эссе...",
  },
  humanizer: {
    name: "Humanizer",
    description: "Превратит шаблонный AI-текст в живое студенческое эссе",
    placeholder: "Вставь сюда «роботизированный» текст...",
  },
  interview: {
    name: "Interview Trainer",
    description: "Симулятор admission interview с feedback по ответам",
    placeholder: "Я готовлюсь к интервью в Stanford на бакалавра. Начнём?",
  },
} as const

type ToolSlug = keyof typeof tools

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params
  if (!(tool in tools)) notFound()
  const config = tools[tool as ToolSlug]

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-6">
        <div>
          <h1 className="font-semibold tracking-tight">{config.name}</h1>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </header>
      <ToolChat tool={tool as ToolSlug} placeholder={config.placeholder} />
    </>
  )
}
