import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { I18nProvider } from "@/lib/i18n/client"
import { getLocale } from "@/lib/i18n/server"
import { PostHogProvider } from "@/lib/analytics"
import "./globals.css"

export const dynamic = "force-dynamic"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://entrium-ai-v2.vercel.app"),
  title: "Entrium AI — Поступление в зарубежные университеты с AI",
  description:
    "8 AI-инструментов для поступления: диагностика профиля, анализ шансов, эссе, интервью, стипендии. База 1504 университета QS.",
  keywords: ["поступление", "университеты", "AI", "стипендии", "эссе", "QS rankings", "study abroad"],
  openGraph: {
    title: "Entrium AI",
    description: "Твой старший брат по поступлению — на основе AI",
    type: "website",
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
    <html lang={locale} className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans">
        <I18nProvider locale={locale}>
          <PostHogProvider>{children}</PostHogProvider>
        </I18nProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
