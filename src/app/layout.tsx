import type { Metadata } from "next"
import { Inter, Playfair_Display, Cinzel, EB_Garamond, DM_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { I18nProvider } from "@/lib/i18n/client"
import { getLocale } from "@/lib/i18n/server"
import { PostHogProvider } from "@/lib/analytics"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const dynamic = "force-dynamic"

const inter = Inter({ variable: "--font-sans", subsets: ["latin", "cyrillic"], display: "swap" })
const playfair = Playfair_Display({ variable: "--font-display", subsets: ["latin", "cyrillic"], display: "swap" })
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], display: "swap", weight: ["400", "500", "600"] })
const garamond = EB_Garamond({ variable: "--font-serif", subsets: ["latin", "cyrillic"], display: "swap" })
const dmMono = DM_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap", weight: ["400", "500"] })

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
      className={`${inter.variable} ${playfair.variable} ${cinzel.variable} ${garamond.variable} ${dmMono.variable} h-full antialiased`}
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
