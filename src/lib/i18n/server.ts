import { cookies, headers } from "next/headers"
import { dict, DEFAULT_LOCALE, LOCALES, type Locale, type Dict } from "./dict"

const COOKIE = "lang"

function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v)
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie

  const headerStore = await headers()
  const accept = headerStore.get("accept-language") ?? ""
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0].trim().slice(0, 2).toLowerCase()
    if (isLocale(tag)) return tag
  }
  return DEFAULT_LOCALE
}

export async function getT(): Promise<Dict> {
  const locale = await getLocale()
  return dict[locale]
}
