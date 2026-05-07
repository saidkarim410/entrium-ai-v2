"use client"

import { createContext, useContext } from "react"
import { dict, type Locale, type Dict } from "./dict"

const I18nCtx = createContext<{ locale: Locale; t: Dict }>({
  locale: "ru",
  t: dict.ru,
})

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale
  children: React.ReactNode
}) {
  return (
    <I18nCtx.Provider value={{ locale, t: dict[locale] }}>{children}</I18nCtx.Provider>
  )
}

export function useT() {
  return useContext(I18nCtx).t
}

export function useLocale() {
  return useContext(I18nCtx).locale
}
