import Link from "next/link"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { Download, CreditCard, Search } from "lucide-react"

export const dynamic = "force-dynamic"

type SearchParams = {
  q?: string
  status?: string
  method?: string
  from?: string
  to?: string
  page?: string
}

const PAGE_SIZE = 50

const STATUS_COLOR: Record<string, string> = {
  succeeded: "bg-emerald-500/15 text-emerald-700",
  pending: "bg-amber-500/15 text-amber-700",
  failed: "bg-rose-500/15 text-rose-700",
  refunded: "bg-slate-500/15 text-slate-700",
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabaseAdmin
    .from("payments")
    .select("id, user_id, amount, currency, payment_method, payment_platform, payment_status, stripe_payment_intent_id, description, payment_date", { count: "exact" })

  if (sp.status) query = query.eq("payment_status", sp.status)
  if (sp.method) query = query.eq("payment_method", sp.method)
  if (sp.from) query = query.gte("payment_date", sp.from)
  if (sp.to) query = query.lte("payment_date", sp.to)
  if (sp.q) query = query.or(`stripe_payment_intent_id.ilike.%${sp.q}%,description.ilike.%${sp.q}%`)

  const { data: payments, count } = await query
    .order("payment_date", { ascending: false })
    .range(from, to)

  // Aggregate top-of-page totals
  const { data: totalsRow } = await supabaseAdmin
    .from("payments")
    .select("amount.sum(), id.count()")
    .eq("payment_status", "succeeded")
    .maybeSingle()
  const totalAmount = (totalsRow as unknown as { sum?: number } | null)?.sum ?? 0

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl tracking-tight inline-flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[var(--brand-red)]" />
            Оплаты
          </h1>
          <p className="font-mono-label text-foreground/60 text-[11px] mt-1">
            ВСЕГО {total.toLocaleString("ru")} · УСПЕШНЫХ НА ${totalAmount.toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <a
          href="/api/admin/export/payments"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono-label hover:border-[var(--brand-red)]/40 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Export .xlsx
        </a>
      </div>

      <form className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2 rounded-xl border border-border bg-card p-3">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="payment_intent / описание"
            className="w-full bg-background border border-border rounded-md pl-8 pr-2 py-1.5 text-sm"
          />
        </div>
        <select name="status" defaultValue={sp.status ?? ""} className="bg-background border border-border rounded-md px-2 py-1.5 text-sm">
          <option value="">Любой статус</option>
          <option value="succeeded">Succeeded</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <input name="method" defaultValue={sp.method ?? ""} placeholder="Метод (visa, ...)" className="bg-background border border-border rounded-md px-2 py-1.5 text-sm" />
        <input name="from" type="date" defaultValue={sp.from ?? ""} className="bg-background border border-border rounded-md px-2 py-1.5 text-sm" />
        <input name="to" type="date" defaultValue={sp.to ?? ""} className="bg-background border border-border rounded-md px-2 py-1.5 text-sm" />
        <button type="submit" className="rounded-md bg-[var(--brand-red)] text-white px-3 py-1.5 text-xs font-mono-label hover:opacity-90 transition-opacity">
          Применить
        </button>
        <Link href="/admin/payments" className="rounded-md border border-border bg-background text-foreground/70 px-3 py-1.5 text-xs font-mono-label hover:border-foreground/40 text-center">
          Сбросить
        </Link>
      </form>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background border-b border-border">
            <tr className="font-mono-label text-[10px] uppercase text-foreground/60">
              <th className="text-left px-3 py-2">payment_id</th>
              <th className="text-left px-3 py-2">user_id</th>
              <th className="text-right px-3 py-2">Сумма</th>
              <th className="text-left px-3 py-2">Метод</th>
              <th className="text-left px-3 py-2">Статус</th>
              <th className="text-left px-3 py-2">Дата</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((p) => (
              <tr key={p.id as string} className="border-b border-border/40 hover:bg-background/40">
                <td className="px-3 py-2 font-mono-label text-[10px] truncate max-w-[140px]">{p.id as string}</td>
                <td className="px-3 py-2 font-mono-label text-[10px] truncate max-w-[140px]">
                  <Link href={`/admin/users?q=${p.user_id}`} className="hover:text-[var(--brand-red)]">{p.user_id as string}</Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {Number(p.amount).toLocaleString("ru", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {(p.currency as string)?.toUpperCase()}
                </td>
                <td className="px-3 py-2 font-mono-label text-[10px] uppercase">{(p.payment_method as string) ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono-label uppercase tracking-wider ${STATUS_COLOR[p.payment_status as string] ?? "bg-foreground/10 text-foreground"}`}>
                    {p.payment_status as string}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono-label text-[10px] text-foreground/60">
                  {p.payment_date ? new Date(p.payment_date as string).toISOString().slice(0, 16).replace("T", " ") : "—"}
                </td>
              </tr>
            ))}
            {(!payments || payments.length === 0) && (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-foreground/60 font-mono-label text-xs">
                  Транзакций не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono-label text-foreground/60 text-[10px]">
            СТРАНИЦА {page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={`?${new URLSearchParams({ ...sp, page: String(page - 1) }).toString()}`}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono-label hover:border-[var(--brand-red)]/40"
              >
                ← Назад
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`?${new URLSearchParams({ ...sp, page: String(page + 1) }).toString()}`}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-mono-label hover:border-[var(--brand-red)]/40"
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
