import { getLocale } from "@/lib/i18n/server"
import type { Locale } from "@/lib/i18n/dict"

/**
 * Returns a system-prompt instruction telling the AI which language to respond in.
 * The instruction is itself in the target language so the model honors it more reliably.
 *
 * Used by /api/chat, /api/agent, /api/ai, /api/applications/<id>/suggest,
 * /api/profile/parse-document and Telegram webhook.
 */
export function languageInstruction(locale: Locale): string {
  switch (locale) {
    case "en":
      return [
        "[LANGUAGE]",
        "Respond in English.",
        "Use natural English (American spelling). Keep numbers, university names, and tests (SAT, IELTS, TOEFL, GPA) untranslated.",
        "If the user writes to you in another language, still respond in English unless they explicitly ask otherwise.",
      ].join("\n")
    case "uz":
      return [
        "[LANGUAGE]",
        "O'zbek tilida (lotin yozuvida) javob ber.",
        "Tabiiy, jonli o'zbekcha ishlat. Universitet nomlari, GPA, SAT, IELTS, TOEFL, AP/IB kabi atamalarni tarjima qilma.",
        "Foydalanuvchi boshqa tilda yozsa ham, o'zbekcha javob ber, agar u boshqa tilda iltimos qilmasa.",
      ].join("\n")
    case "ru":
    default:
      return [
        "[LANGUAGE]",
        "Отвечай на русском языке.",
        "Используй естественный, живой русский. Названия университетов, GPA, SAT, IELTS, TOEFL, AP/IB не переводи.",
        "Если пользователь пишет на другом языке, всё равно отвечай по-русски, если не просит иначе.",
      ].join("\n")
  }
}

/**
 * Convenience wrapper: read locale from request context (cookies/headers)
 * and return the instruction.
 */
export async function getLanguageInstruction(): Promise<string> {
  const locale = await getLocale()
  return languageInstruction(locale)
}
