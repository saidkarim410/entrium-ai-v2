"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "@/lib/i18n/client"
import { LOCALES, type Locale } from "@/lib/i18n/dict"
import { persistUserLanguage } from "@/lib/i18n/actions"
import { Languages } from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const NAMES: Record<Locale, string> = { ru: "Русский", en: "English", uz: "O'zbekcha" }
const FLAGS: Record<Locale, string> = { ru: "🇷🇺", en: "🇬🇧", uz: "🇺🇿" }

export function LangSwitcher({ size = "sm" }: { size?: "sm" | "default" | "icon" }) {
  const current = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function setLang(l: Locale) {
    // eslint-disable-next-line react-hooks/immutability -- intentional cookie write in click handler
    document.cookie = `lang=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    // Best-effort: persist to profile so Telegram bot + email use the same lang
    persistUserLanguage(l).catch(() => null)
    startTransition(() => router.refresh())
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className={cn(
          buttonVariants({ variant: "ghost", size }),
          "gap-1.5"
        )}
      >
        <Languages className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{FLAGS[current]} {NAMES[current]}</span>
        <span className="sm:hidden">{FLAGS[current]}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onClick={() => setLang(l)} className="gap-2 cursor-pointer">
            {FLAGS[l]} {NAMES[l]}
            {l === current && <span className="ml-auto text-xs">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
