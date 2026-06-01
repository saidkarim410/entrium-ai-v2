import { supabaseAdmin } from "@/lib/supabase/admin"
import { stripeEnabled, env } from "@/lib/env"
import { HeartPulse, CheckCircle2, XCircle, AlertCircle } from "lucide-react"

export const dynamic = "force-dynamic"

type Status = "ok" | "warn" | "fail"
type Check = {
  name: string
  status: Status
  detail: string
}

async function runChecks(): Promise<Check[]> {
  const checks: Check[] = []

  // Supabase DB connectivity
  try {
    const { error, count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
    if (error) throw error
    checks.push({
      name: "Supabase Postgres",
      status: "ok",
      detail: `Connected · ${count ?? 0} profile(s) total`,
    })
  } catch (e) {
    checks.push({
      name: "Supabase Postgres",
      status: "fail",
      detail: e instanceof Error ? e.message : "Unknown error",
    })
  }

  // Vector index health
  try {
    const { data, error } = await supabaseAdmin
      .from("universities")
      .select("id", { count: "exact", head: true })
    if (error) throw error
    void data
    checks.push({
      name: "Vector index (universities)",
      status: "ok",
      detail: "Reachable",
    })
  } catch (e) {
    checks.push({
      name: "Vector index (universities)",
      status: "fail",
      detail: e instanceof Error ? e.message : "Unknown error",
    })
  }

  // payments table presence (migration 0019)
  try {
    const { error, count } = await supabaseAdmin
      .from("payments")
      .select("id", { count: "exact", head: true })
    if (error) throw error
    checks.push({
      name: "entrium.payments",
      status: "ok",
      detail: `Migration 0019 applied · ${count ?? 0} rows`,
    })
  } catch (e) {
    checks.push({
      name: "entrium.payments",
      status: "fail",
      detail: "Migration 0019 not applied? " + (e instanceof Error ? e.message : ""),
    })
  }

  // Stripe configured
  checks.push({
    name: "Stripe",
    status: stripeEnabled() && env.STRIPE_WEBHOOK_SECRET ? "ok" : "warn",
    detail: stripeEnabled()
      ? env.STRIPE_WEBHOOK_SECRET
        ? "Secret + webhook key present"
        : "Secret key present, webhook secret missing"
      : "Stripe not configured (STRIPE_SECRET_KEY missing)",
  })

  // Anthropic / OpenAI keys
  checks.push({
    name: "AI provider (Anthropic)",
    status: env.ANTHROPIC_API_KEY ? "ok" : "fail",
    detail: env.ANTHROPIC_API_KEY ? "Key present" : "ANTHROPIC_API_KEY missing",
  })
  checks.push({
    name: "Embeddings (OpenAI)",
    status: env.OPENAI_API_KEY ? "ok" : "warn",
    detail: env.OPENAI_API_KEY ? "Key present" : "OPENAI_API_KEY missing (embeddings disabled)",
  })

  // Telegram bot
  checks.push({
    name: "Telegram bot",
    status: env.TELEGRAM_BOT_TOKEN ? "ok" : "warn",
    detail: env.TELEGRAM_BOT_TOKEN
      ? "TELEGRAM_BOT_TOKEN present"
      : "Token missing — TG login + broadcasts disabled",
  })

  // Resend email
  checks.push({
    name: "Resend email",
    status: env.RESEND_API_KEY ? "ok" : "warn",
    detail: env.RESEND_API_KEY ? "Key present" : "RESEND_API_KEY missing",
  })

  return checks
}

export default async function AdminHealthPage() {
  const checks = await runChecks()
  const failing = checks.filter((c) => c.status === "fail").length
  const warning = checks.filter((c) => c.status === "warn").length

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <p className="font-mono-label text-[10px] tracking-[0.16em] text-white/45 uppercase mb-1">
          Admin Console
        </p>
        <h1 className="font-display text-2xl tracking-tight inline-flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-[var(--brand-red)]" />
          Состояние системы
        </h1>
        <p className="font-mono-label text-white/45 text-[11px] mt-1">
          {failing > 0
            ? `${failing} ОШИБКИ · ${warning} ПРЕДУПРЕЖДЕНИЙ`
            : warning > 0
            ? `${warning} ПРЕДУПРЕЖДЕНИЙ · НЕТ ОШИБОК`
            : "ВСЁ ОК"}
        </p>
      </div>

      <div className="space-y-2">
        {checks.map((c) => (
          <div
            key={c.name}
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              c.status === "ok"
                ? "border-emerald-500/30 bg-emerald-500/5"
                : c.status === "warn"
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-rose-500/30 bg-rose-500/5"
            }`}
          >
            <div className="mt-0.5">
              {c.status === "ok" && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {c.status === "warn" && <AlertCircle className="h-5 w-5 text-amber-400" />}
              {c.status === "fail" && <XCircle className="h-5 w-5 text-rose-400" />}
            </div>
            <div className="flex-1">
              <div className="font-display text-base mb-0.5">{c.name}</div>
              <div className="text-sm text-white/65">{c.detail}</div>
            </div>
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono-label uppercase tracking-wider ${
                c.status === "ok"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : c.status === "warn"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-rose-500/20 text-rose-300"
              }`}
            >
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
