import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Search, Download, Users as UsersIcon } from "lucide-react"

export const dynamic = "force-dynamic"

type SearchParams = {
  q?: string
  country?: string
  city?: string
  uni?: string
  min_age?: string
  max_age?: string
  has_payments?: string
  registered_from?: string
  registered_to?: string
  page?: string
}

const PAGE_SIZE = 50

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabaseAdmin
    .from("users_with_payments")
    .select("*", { count: "exact" })

  if (sp.q) {
    const term = `%${sp.q.replace(/[%_]/g, "\\$&")}%`
    query = query.or(
      [
        `email.ilike.${term}`,
        `first_name.ilike.${term}`,
        `last_name.ilike.${term}`,
        `full_name.ilike.${term}`,
        `phone.ilike.${term}`,
        `school_or_university.ilike.${term}`,
      ].join(","),
    )
  }
  if (sp.country) query = query.eq("country", sp.country)
  if (sp.city) query = query.ilike("city", `%${sp.city}%`)
  if (sp.uni) query = query.ilike("school_or_university", `%${sp.uni}%`)
  if (sp.min_age) query = query.gte("age", parseInt(sp.min_age, 10))
  if (sp.max_age) query = query.lte("age", parseInt(sp.max_age, 10))
  if (sp.has_payments === "yes") query = query.gt("payment_count", 0)
  if (sp.has_payments === "no") query = query.eq("payment_count", 0)
  if (sp.registered_from) query = query.gte("registration_date", sp.registered_from)
  if (sp.registered_to) query = query.lte("registration_date", sp.registered_to)

  const { data: users, count } = await query
    .order("registration_date", { ascending: false })
    .range(from, to)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono-label text-[10px] tracking-[0.16em] text-white/45 uppercase mb-1">
            Admin Console
          </p>
          <h1 className="font-display text-2xl tracking-tight inline-flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-[var(--brand-red)]" />
            Пользователи
          </h1>
          <p className="font-mono-label text-white/45 text-[11px] mt-1">
            {total.toLocaleString("ru")} ВСЕГО · СТРАНИЦА {page} ИЗ {totalPages}
          </p>
        </div>
        <a
          href="/api/admin/export/users"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs font-mono-label text-white/85 hover:bg-white/[0.06] hover:border-white/25 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export .xlsx
        </a>
      </div>

      {/* Filters */}
      <form className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <div className="sm:col-span-3 lg:col-span-2 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Поиск: email, имя, телефон, школа..."
            className="w-full bg-[#0a0a0a] border border-white/10 rounded-md pl-8 pr-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/30"
          />
        </div>
        <input name="country" defaultValue={sp.country ?? ""} placeholder="Страна" className="bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/30" />
        <input name="city" defaultValue={sp.city ?? ""} placeholder="Город" className="bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/30" />
        <input name="uni" defaultValue={sp.uni ?? ""} placeholder="Школа / уни" className="bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/30" />
        <div className="flex gap-1">
          <input name="min_age" type="number" min="0" defaultValue={sp.min_age ?? ""} placeholder="мин" className="w-1/2 bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/30" />
          <input name="max_age" type="number" min="0" defaultValue={sp.max_age ?? ""} placeholder="макс" className="w-1/2 bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/30" />
        </div>
        <select name="has_payments" defaultValue={sp.has_payments ?? ""} className="bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/30">
          <option value="">Любые оплаты</option>
          <option value="yes">Только платящие</option>
          <option value="no">Без оплат</option>
        </select>
        <input name="registered_from" type="date" defaultValue={sp.registered_from ?? ""} className="bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/30" />
        <input name="registered_to" type="date" defaultValue={sp.registered_to ?? ""} className="bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-white/30" />
        <button type="submit" className="rounded-md bg-[var(--brand-red)] text-white px-3 py-1.5 text-xs font-mono-label hover:opacity-90 transition-opacity sm:col-span-2 lg:col-span-1">
          Применить
        </button>
        <Link href="/admin/users" className="rounded-md border border-white/10 bg-transparent text-white/65 px-3 py-1.5 text-xs font-mono-label hover:border-white/25 text-center">
          Сбросить
        </Link>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10">
            <tr className="font-mono-label text-[10px] uppercase text-white/55">
              <th className="text-left px-3 py-2.5">Email</th>
              <th className="text-left px-3 py-2.5">Имя</th>
              <th className="text-left px-3 py-2.5">Возр</th>
              <th className="text-left px-3 py-2.5">Город</th>
              <th className="text-left px-3 py-2.5">Школа / Уни</th>
              <th className="text-left px-3 py-2.5">Provider</th>
              <th className="text-left px-3 py-2.5">Tier</th>
              <th className="text-right px-3 py-2.5">Оплат</th>
              <th className="text-right px-3 py-2.5">$</th>
              <th className="text-left px-3 py-2.5">Регистрация</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u: Record<string, unknown>) => (
              <tr
                key={u.user_id as string}
                className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
              >
                <td className="px-3 py-2 truncate max-w-[200px]">
                  <Link
                    href={`/admin/users/${u.user_id}`}
                    className="text-white hover:text-[var(--brand-red)] transition-colors"
                  >
                    {(u.email as string) ?? "—"}
                  </Link>
                </td>
                <td className="px-3 py-2 truncate max-w-[160px] text-white/85">
                  {[u.first_name, u.last_name].filter(Boolean).join(" ") || (u.full_name as string) || "—"}
                </td>
                <td className="px-3 py-2 tabular-nums text-white/75">{(u.age as number) ?? "—"}</td>
                <td className="px-3 py-2 truncate max-w-[120px] text-white/75">{(u.city as string) ?? "—"}</td>
                <td className="px-3 py-2 truncate max-w-[200px] text-white/75">{(u.school_or_university as string) ?? "—"}</td>
                <td className="px-3 py-2 font-mono-label text-[10px] uppercase text-white/75">{(u.auth_provider as string) ?? "—"}</td>
                <td className="px-3 py-2 font-mono-label text-[10px] uppercase">
                  <span
                    className={
                      u.tier === "pro"
                        ? "px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300"
                        : "px-1.5 py-0.5 rounded bg-white/10 text-white/65"
                    }
                  >
                    {(u.tier as string) ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-white/75">{(u.payment_count as number) ?? 0}</td>
                <td className="px-3 py-2 text-right tabular-nums text-white/85">{Number(u.total_paid ?? 0).toFixed(2)}</td>
                <td className="px-3 py-2 font-mono-label text-[10px] text-white/55">
                  {u.registration_date ? new Date(u.registration_date as string).toISOString().slice(0, 10) : "—"}
                </td>
              </tr>
            ))}
            {(!users || users.length === 0) && (
              <tr>
                <td colSpan={10} className="px-3 py-12 text-center text-white/40 font-mono-label text-xs">
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono-label text-white/55 text-[10px]">
            СТРАНИЦА {page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-mono-label text-white/85 hover:border-white/25 hover:bg-white/[0.03] transition-colors"
              >
                ← Назад
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-mono-label text-white/85 hover:border-white/25 hover:bg-white/[0.03] transition-colors"
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
