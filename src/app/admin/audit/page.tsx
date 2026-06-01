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
    <div className="space-y-5 max-w-7xl">
      <div>
        <p className="font-mono-label text-[10px] tracking-[0.16em] text-white/45 uppercase mb-1">
          Admin Console
        </p>
        <h1 className="font-display text-2xl tracking-tight inline-flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--brand-red)]" />
          Audit log
        </h1>
        <p className="font-mono-label text-white/45 text-[11px] mt-1">
          ПОСЛЕДНИЕ {PAGE_SIZE} ADMIN-ДЕЙСТВИЙ · ИСТОЧНИК `entrium.audit_logs`
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="font-mono-label text-[10px] uppercase text-white/55">
              <th className="text-left px-3 py-2.5">Когда</th>
              <th className="text-left px-3 py-2.5">Actor</th>
              <th className="text-left px-3 py-2.5">Action</th>
              <th className="text-left px-3 py-2.5">Цель</th>
              <th className="text-left px-3 py-2.5">Детали</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.id as string} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                <td className="px-3 py-2 font-mono-label text-[10px] text-white/55 whitespace-nowrap">
                  {r.created_at ? new Date(r.created_at as string).toISOString().slice(0, 19).replace("T", " ") : "—"}
                </td>
                <td className="px-3 py-2 font-mono-label text-[10px] text-white/75 truncate max-w-[160px]">
                  {(r.actor_id as string) ?? "—"}
                </td>
                <td className="px-3 py-2 font-mono-label text-[11px] text-white">
                  {r.action as string}
                </td>
                <td className="px-3 py-2 font-mono-label text-[10px] text-white/75">
                  {r.target_table ? `${r.target_table}#${(r.target_id as string)?.slice(0, 8) ?? ""}` : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-[10px] text-white/55 truncate max-w-[400px]">
                  {JSON.stringify(r.details ?? {})}
                </td>
              </tr>
            ))}
            {(!rows || rows.length === 0) && (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-white/40 font-mono-label text-xs">
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
