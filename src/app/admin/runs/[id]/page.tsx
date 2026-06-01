import Link from "next/link"
import { notFound } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { ArrowLeft, Bot } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function AdminRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const { data: run } = await supabaseAdmin
    .from("tool_runs")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!run) notFound()

  const inputJson = JSON.stringify(run.input, null, 2)
  const outputObj = run.output as { text?: string } | null
  const outputText = outputObj?.text ?? JSON.stringify(run.output, null, 2)

  return (
    <div className="space-y-5 max-w-5xl">
      <Link
        href="/admin/runs"
        className="inline-flex items-center gap-1.5 text-xs text-white/55 hover:text-white"
      >
        <ArrowLeft className="h-3 w-3" /> Все runs
      </Link>

      <div>
        <p className="font-mono-label text-[10px] tracking-[0.16em] text-white/45 uppercase mb-1">
          Tool run
        </p>
        <h1 className="font-display text-2xl tracking-tight inline-flex items-center gap-2">
          <Bot className="h-5 w-5 text-[var(--brand-red)]" />
          {run.tool as string}
        </h1>
        <div className="mt-2 flex items-center gap-3 text-xs text-white/55 font-mono-label">
          <span>
            User:{" "}
            <Link href={`/admin/users/${run.user_id}`} className="hover:text-[var(--brand-red)]">
              {(run.user_id as string).slice(0, 8)}…
            </Link>
          </span>
          <span>·</span>
          <span>{new Date(run.created_at as string).toISOString().replace("T", " ").slice(0, 19)}</span>
          <span>·</span>
          <span
            className={`px-1.5 py-0.5 rounded uppercase text-[9px] ${
              run.status === "success"
                ? "bg-emerald-500/15 text-emerald-300"
                : run.status === "error"
                ? "bg-rose-500/15 text-rose-300"
                : "bg-amber-500/15 text-amber-300"
            }`}
          >
            {run.status as string}
          </span>
          <span>·</span>
          <span>{run.duration_ms ? `${run.duration_ms} ms` : "—"}</span>
        </div>
      </div>

      {run.error_message && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="font-mono-label text-[10px] uppercase text-rose-300 mb-1.5">Error</p>
          <pre className="text-xs text-rose-100 whitespace-pre-wrap break-words">
            {run.error_message as string}
          </pre>
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <p className="font-mono-label text-[10px] uppercase text-white/55 mb-2">Input</p>
        <pre className="text-xs text-white/85 whitespace-pre-wrap break-words font-mono bg-[#0a0a0a] border border-white/5 rounded-lg p-3 max-h-[400px] overflow-auto">
          {inputJson}
        </pre>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <p className="font-mono-label text-[10px] uppercase text-white/55 mb-2">Output</p>
        <pre className="text-xs text-white/85 whitespace-pre-wrap break-words font-mono bg-[#0a0a0a] border border-white/5 rounded-lg p-3 max-h-[600px] overflow-auto">
          {outputText}
        </pre>
      </div>
    </div>
  )
}
