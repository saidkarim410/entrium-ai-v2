import type { Metadata } from "next"
import { Manrope, JetBrains_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { I18nProvider } from "@/lib/i18n/client"
import { getLocale } from "@/lib/i18n/server"
import { PostHogProvider } from "@/lib/analytics"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const dynamic = "force-dynamic"

/* Brand fonts (v2 — matches printed posts + logo):
   - Manrope    → both UI body (--font-sans) and heavy display (--font-display, weight 800).
                  Full Cyrillic + Latin; weights 200…800 cover everything from labels to mega-headlines.
   - JetBrains  → mono labels ("TOP 2027 · QS WORLD RANKING").
   The old --font-serif and --font-cinzel vars are kept as aliases to Manrope
   so the (app) zone code that still references them does not break. */
const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
})
const manropeDisplay = Manrope({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["700", "800"],
})
const manropeSerif = Manrope({
  variable: "--font-serif",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400", "500"],
})
const manropeCinzel = Manrope({
  variable: "--font-cinzel",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["600", "700"],
})
const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400", "500"],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://entrium-ai-v2.vercel.app"),
  title: "Entrium AI — Твой шанс на MIT · Stanford · Cambridge · ETH",
  description:
    "AI-консультант по поступлению в топовые университеты. Анализ профиля, эссе уровня Ivy, тренировка интервью, персональный план. Создано для студентов из Узбекистана и СНГ.",
  keywords: ["поступление", "университеты", "AI", "стипендии", "эссе", "QS rankings", "MIT", "Harvard", "Oxford", "study abroad", "Узбекистан"],
  openGraph: {
    title: "Entrium AI",
    description: "AI-консультант по поступлению в топовые университеты мира",
    type: "website",
    siteName: "Entrium AI",
  },
  twitter: { card: "summary_large_image" },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  return (
    <html
      lang={locale}
      className={`${manrope.variable} ${manropeDisplay.variable} ${manropeCinzel.variable} ${manropeSerif.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <a href="#main" className="skip-link">Skip to content</a>
        <ThemeProvider>
          <I18nProvider locale={locale}>
            <PostHogProvider>{children}</PostHogProvider>
          </I18nProvider>
          {/* Toaster theme is "system" so light/dark theming flows through */}
          <Toaster richColors position="top-center" theme="system" />
        </ThemeProvider>
      </body>
    </html>
  )
}
