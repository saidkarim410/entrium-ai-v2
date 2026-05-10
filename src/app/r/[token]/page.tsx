import { loadInviteByToken } from "@/lib/recommenders/actions"
import { RecommenderUploadForm } from "./upload-form"
import { AlertCircle, FileX, Clock } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"
export const metadata = { title: "Рекомендация · Entrium" }

/**
 * F-2 (TZ): public landing for recommender PDF upload.
 *
 * No auth required — the URL token is the credential. Three failure
 * modes (not_found / expired / already_submitted) get their own
 * informational screens; the happy path renders the upload form.
 */
export default async function RecommenderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await loadInviteByToken(token)

  if (!result.ok) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          {result.reason === "not_found" && (
            <>
              <FileX className="h-12 w-12 text-cream-3 mx-auto" />
              <h1 className="font-display text-2xl">Приглашение не найдено</h1>
              <p className="font-serif text-sm text-cream-2">
                Эта ссылка не валидна или была отозвана.
                Свяжитесь со студентом — он может выслать новое приглашение.
              </p>
            </>
          )}
          {result.reason === "expired" && (
            <>
              <Clock className="h-12 w-12 text-cream-3 mx-auto" />
              <h1 className="font-display text-2xl">Срок ссылки истёк</h1>
              <p className="font-serif text-sm text-cream-2">
                Приглашения действуют 60 дней. Попросите студента отправить новое.
              </p>
            </>
          )}
          {result.reason === "already_submitted" && (
            <>
              <AlertCircle className="h-12 w-12 text-emerald-300 mx-auto" />
              <h1 className="font-display text-2xl">Рекомендация уже получена</h1>
              <p className="font-serif text-sm text-cream-2">
                Спасибо! Файл уже доставлен студенту.
                Если нужно прислать обновлённую версию — попросите его выдать новую ссылку.
              </p>
            </>
          )}
          <Link
            href="https://entrium-ai-v2.vercel.app"
            className="inline-block text-xs font-mono-label text-gold hover:underline mt-4"
          >
            entrium-ai-v2.vercel.app →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-xl mx-auto py-6 sm:py-12">
        {/* Branded header */}
        <div className="text-center mb-8 space-y-2">
          <p className="font-mono-label text-[10px] text-gold uppercase tracking-[0.3em]">
            Entrium AI · Рекомендация
          </p>
          <h1 className="font-display text-2xl sm:text-3xl text-cream">
            Здравствуйте, {result.invite.recommenderName}
          </h1>
          <p className="font-serif text-sm sm:text-base text-cream-2 leading-relaxed">
            <strong className="text-cream">{result.invite.studentName}</strong> просит вас прислать
            рекомендательное письмо для поступления.
          </p>
        </div>

        {result.invite.message && (
          <blockquote className="rounded-xl border-l-2 border-gold pl-4 sm:pl-5 py-3 sm:py-4 mb-6 bg-gold/5">
            <p className="font-serif italic text-sm text-cream-2 leading-relaxed">
              {result.invite.message}
            </p>
          </blockquote>
        )}

        <RecommenderUploadForm token={token} />

        <p className="text-center font-mono-label text-[10px] text-cream-3 mt-8">
          Файл отправляется напрямую студенту.
          Срок ссылки — до{" "}
          {new Date(result.invite.expiresAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}.
        </p>
      </div>
    </div>
  )
}
