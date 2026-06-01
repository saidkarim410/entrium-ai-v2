import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Bot, Search } from "lucide-react"

export const dynamic = "force-dynamic"

type SearchParams = {
  tool?: string
  status?: string
  user?: string
  page?: string
}

const PAGE_SIZE = 60

export default async function AdminRunsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabaseAdmin
    .from("tool_runs")
    .select("id, user_id, tool, status, duration_ms, error_message, created_at", { count: "exact" })

  if (sp.tool) query = query.eq("tool", sp.tool)
  if (sp.status) query = query.eq("status", sp.status)
  if (sp.user) query = query.eq("user_id", sp.user)

  const { data: runs, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to)

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono-label text-[10px] tracking-[0.16em] text-white/45 uppercase mb-1">
            Admin Console
          </p>
          <h1 className="font-display text-2xl tracking-tight inline-flex items-center gap-2">
            <Bot className="h-5 w-5 text-[var(--brand-red)]" />
            AI runs
          </h1>
          <p className="font-mono-label text-white/45 text-[11px] mt-1">
            {(count ?? 0).toLocaleString("ru")} ЗАПУСКОВ · СТРАНИЦА {page} ИЗ {totalPages}
          </p>
        </div>
      </div>

      <form className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            name="user"
            defaultValue={sp.user ?? ""}
            placeholder="user_id..."
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md pl-8 pr-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
        <input
          name="tool"
          defaultValue={sp.tool ?? ""}
          placeholder="tool (essay, interview, ...)"
          className="bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 w-48"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white"
        >
          <option value="">Все статусы</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="pending">Pending</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-[var(--brand-red)] text-white px-3 py-1.5 text-xs font-mono-label hover:opacity-90"
        >
          Применить
        </button>
        <Link
          href="/admin/runs"
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-mono-label text-white/65 hover:border-white/25"
        >
          Сбросить
        </Link>
      </form>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="font-mono-label text-[10px] uppercase text-white/55">
              <th className="text-left px-3 py-2.5">Когда</th>
              <th className="text-left px-3 py-2.5">User</th>
              <th className="text-left px-3 py-2.5">Tool</th>
              <th className="text-left px-3 py-2.5">Статус</th>
              <th className="text-right px-3 py-2.5">Длит, ms</th>
              <th className="text-left px-3 py-2.5">Ошибка</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(runs ?? []).map((row) => (
              <tr key={row.id as string} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-3 py-2 font-mono-label text-[10px] text-white/55 whitespace-nowrap">
                  {new Date(row.created_at as string).toISOString().slice(5, 16).replace("T", " ")}
                </td>
                <td className="px-3 py-2 font-mono-label text-[10px] truncate max-w-[140px]">
                  <Link href={`/admin/users/${row.user_id}`} className="hover:text-[var(--brand-red)]">
                    {(row.user_id as string).slice(0, 8)}…
                  </Link>
                </td>
                <td className="px-3 py-2 text-white">{row.tool as string}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono-label uppercase ${
                      row.status === "success"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : row.status === "error"
                        ? "bg-rose-500/15 text-rose-300"
                        : "bg-amber-500/15 text-amber-300"
                    }`}
                  >
                    {row.status as string}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/65 text-xs">
                  {row.duration_ms ?? "—"}
                </td>
                <td className="px-3 py-2 text-rose-300/85 text-xs truncate max-w-[260px]">
                  {(row.error_message as string) ?? ""}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/admin/runs/${row.id}`}
                    className="text-[10px] font-mono-label text-white/55 hover:text-[var(--brand-red)]"
                  >
                    Открыть →
                  </Link>
                </td>
              </tr>
            ))}
            {(!runs || runs.length === 0) && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-white/40 font-mono-label text-xs">
                  Запусков не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono-label text-white/55 text-[10px]">
            СТРАНИЦА {page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-mono-label hover:border-white/25"
              >
                ← Назад
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-mono-label hover:border-white/25"
              >
                Вперёд →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
