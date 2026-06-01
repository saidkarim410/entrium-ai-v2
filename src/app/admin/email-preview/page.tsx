import { redirect } from "next/navigation"
import Link from "next/link"
import { getCurrentProfile } from "@/lib/supabase/server"
import { weeklyDigestHtml, weeklyDigestSubject, type WeeklyDigestData } from "@/lib/email/templates"
import { ArrowLeft } from "lucide-react"
import type { Locale } from "@/lib/i18n/dict"

export const dynamic = "force-dynamic"

/**
 * Live preview of the weekly digest email — shows what users actually receive.
 * Renders the same template that /api/cron/weekly-digest produces, with mock
 * data tailored to be illustrative (urgent deadline, multiple apps, etc.).
 *
 * Useful for: tweaking the template before going live with Resend, sharing
 * with stakeholders, screenshotting for marketing.
 *
 * Lang switcher in URL: /admin/email-preview?lang=en (or ru, uz)
 */
export default async function EmailPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>
}) {
  const profile = await getCurrentProfile()
  if (!profile) redirect("/login?next=/admin/email-preview")

  const params = await searchParams
  const lang: Locale = (["ru", "en", "uz"] as const).includes(params.lang as Locale)
    ? (params.lang as Locale)
    : "ru"

  const data: WeeklyDigestData = {
    firstName: profile.full_name?.split(" ")[0] ?? "Said",
    appsCount: 7,
    upcomingApps: [
      { university: "MIT", status: "В работе", daysOut: 4, deadline: "2026-05-13" },
      { university: "Stanford", status: "Планирую", daysOut: 12, deadline: "2026-05-21" },
      { university: "ETH Zürich", status: "Подано", daysOut: 35, deadline: "2026-06-13" },
      { university: "TUM", status: "Интервью", daysOut: 60, deadline: "2026-07-08" },
      { university: "NUS", status: "Планирую", daysOut: 92, deadline: "2026-08-09" },
    ],
    unreadNotifs: 3,
    weekRunCount: 12,
    topRecommendation: {
      title: "Run final review for MIT",
      reason: "Дедлайн через 4 дня. AI Reviewer найдёт последние слабости в эссе и заявке за 2 минуты — admission officer'ы выловят то же самое.",
      href: "https://entrium-ai-v2.vercel.app/tools/reviewer",
    },
    unsubscribeUrl: "https://entrium-ai-v2.vercel.app/api/email/unsubscribe?token=preview",
    siteUrl: "https://entrium-ai-v2.vercel.app",
  }

  const html = weeklyDigestHtml(data, lang)
  const subject = weeklyDigestSubject(data, lang)

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 gap-3">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <Link href="/settings" className="text-cream-3 hover:text-gold transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Email preview</h1>
            <p className="font-mono-label text-cream-3 mt-0.5 truncate">
              Subject: «{subject}»
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(["ru", "en", "uz"] as const).map((l) => (
            <Link
              key={l}
              href={`/admin/email-preview?lang=${l}`}
              className={`rounded-md border px-2 py-1 text-[10px] font-mono-label uppercase tracking-wider transition-colors ${
                l === lang
                  ? "bg-gold/15 border-gold/40 text-gold"
                  : "bg-card border-border text-cream-3 hover:text-cream"
              }`}
            >
              {l}
            </Link>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-zinc-900">
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          <div className="rounded-xl border border-border bg-background overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-border/40 bg-card/40 flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-cream-3/15 text-cream-2 text-xs font-mono">
                E
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm truncate">Entrium AI</p>
                <p className="font-mono-label text-[10px] text-cream-3">noreply@entrium.ai</p>
              </div>
              <span className="font-mono-label text-[10px] text-cream-3 shrink-0">
                {new Date().toLocaleDateString("ru-RU", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </div>
            {/* Render the email body in an iframe so its inline styles don't leak */}
            <iframe
              srcDoc={html}
              title="Email preview"
              className="w-full bg-white border-0"
              style={{ height: "1100px" }}
            />
          </div>
          <p className="mt-4 text-xs font-mono-label text-cream-3 text-center">
            Mock-данные · реальные emails отправляются крон-задачей по воскресеньям 18:00 UTC
          </p>
        </div>
      </div>
    </>
  )
}
