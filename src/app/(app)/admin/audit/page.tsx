import { supabaseAdmin } from "@/lib/supabase/admin"
import { Activity } from "lucide-react"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 100

export default async function AuditLogPage() {
  const { data: rows } = await supabaseAdmin
    .from("audit_logs")
    .select("id, actor_id, action, target_table, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <h1 className="font-display text-2xl tracking-tight inline-flex items-center gap-2">
        <Activity className="h-5 w-5 text-[var(--brand-red)]" />
        Audit log
      </h1>
      <p className="font-mono-label text-foreground/60 text-[11px]">
        Последние {PAGE_SIZE} admin-действий. Пишется через `entrium.audit_logs`.
      </p>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border">
            <tr className="font-mono-label text-[10px] uppercase text-foreground/60">
              <th className="text-left px-3 py-2">Когда</th>
              <th className="text-left px-3 py-2">Actor</th>
              <th className="text-left px-3 py-2">Action</th>
              <th className="text-left px-3 py-2">Цель</th>
              <th className="text-left px-3 py-2">Детали</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id as string} className="border-b border-border/40">
                <td className="px-3 py-2 font-mono-label text-[10px] text-foreground/60 whitespace-nowrap">
                  {r.created_at ? new Date(r.created_at as string).toISOString().slice(0, 19).replace("T", " ") : "—"}
                </td>
                <td className="px-3 py-2 font-mono-label text-[10px] truncate max-w-[160px]">{(r.actor_id as string) ?? "—"}</td>
                <td className="px-3 py-2 font-mono-label text-[11px]">{r.action as string}</td>
                <td className="px-3 py-2 font-mono-label text-[10px] text-foreground/70">
                  {r.target_table ? `${r.target_table}#${(r.target_id as string)?.slice(0, 8) ?? ""}` : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-foreground/60 truncate max-w-[400px]">
                  {JSON.stringify(r.details ?? {})}
                </td>
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-foreground/60 font-mono-label text-xs">
                  Лог пуст
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
