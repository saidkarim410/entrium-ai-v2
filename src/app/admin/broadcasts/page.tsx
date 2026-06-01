import { supabaseAdmin } from "@/lib/supabase/admin"
import { Send, Activity } from "lucide-react"
import { BroadcastForm } from "./broadcast-form"

export const dynamic = "force-dynamic"

export default async function AdminBroadcastsPage() {
  const { count: linkedTelegram } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("telegram_chat_id", "is", null)

  // Recent broadcasts from audit log
  const { data: recent } = await supabaseAdmin
    .from("audit_logs")
    .select("id, details, created_at")
    .eq("action", "broadcast.telegram")
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <p className="font-mono-label text-[10px] tracking-[0.16em] text-white/45 uppercase mb-1">
          Admin Console
        </p>
        <h1 className="font-display text-2xl tracking-tight inline-flex items-center gap-2">
          <Send className="h-5 w-5 text-[var(--brand-red)]" />
          Рассылки
        </h1>
        <p className="text-sm text-white/55 mt-2 leading-relaxed">
          Отправь сообщение всем пользователям, привязавшим Telegram-бота{" "}
          <code className="px-1 py-0.5 bg-white/[0.05] rounded text-white/80">@entriumleedbot</code>.
          Сейчас linked: <strong className="text-white">{linkedTelegram ?? 0}</strong>.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <BroadcastForm linkedTelegramCount={linkedTelegram ?? 0} />
      </div>

      {(recent ?? []).length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
          <h2 className="font-display text-base inline-flex items-center gap-2">
            <Activity className="h-4 w-4 text-white/55" />
            Последние рассылки
          </h2>
          <div className="space-y-2">
            {(recent ?? []).map((row) => {
              const d = row.details as {
                tier?: string
                sent?: number
                failed?: number
                message_preview?: string
              } | null
              return (
                <div key={row.id as string} className="border border-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono-label text-[10px] uppercase text-white/55">
                      {new Date(row.created_at as string).toISOString().slice(0, 16).replace("T", " ")} ·{" "}
                      tier {d?.tier ?? "?"}
                    </span>
                    <span className="font-mono-label text-[10px] text-white/65">
                      ✓ {d?.sent ?? 0} · ✗ {d?.failed ?? 0}
                    </span>
                  </div>
                  <p className="text-xs text-white/75 line-clamp-2">{d?.message_preview ?? ""}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
