import Link from "next/link"
import {
  Heart, BarChart3, Users, CreditCard, Repeat, Bot, Send,
  Activity, Mail, HeartPulse, LogOut, ChevronRight,
} from "lucide-react"
import { requireAdminPage } from "@/lib/admin/auth"
import { logoutAction } from "@/app/(auth)/actions"

export const dynamic = "force-dynamic"

// Sidebar nav for the admin console. Grouped by purpose so the sidebar
// stays scannable even as we add more pages. Each item points at a
// route under /admin.
const NAV_GROUPS: Array<{
  label: string
  items: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>
}> = [
  {
    label: "OVERVIEW",
    items: [
      { href: "/admin", label: "Обзор", icon: BarChart3 },
      { href: "/admin/health", label: "Состояние системы", icon: HeartPulse },
    ],
  },
  {
    label: "ЛЮДИ И ДЕНЬГИ",
    items: [
      { href: "/admin/users", label: "Пользователи", icon: Users },
      { href: "/admin/payments", label: "Оплаты", icon: CreditCard },
      { href: "/admin/subscriptions", label: "Подписки", icon: Repeat },
    ],
  },
  {
    label: "AI И КОММУНИКАЦИИ",
    items: [
      { href: "/admin/runs", label: "AI runs (история)", icon: Bot },
      { href: "/admin/broadcasts", label: "Рассылки", icon: Send },
      { href: "/admin/email-preview", label: "Email превью", icon: Mail },
    ],
  },
  {
    label: "AUDIT",
    items: [
      { href: "/admin/audit", label: "Audit log", icon: Activity },
    ],
  },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage()

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-[#fafafa] flex">
      {/* Sidebar — dark theme, distinct from the user-facing platform */}
      <aside className="w-64 shrink-0 border-r border-white/10 bg-[#0f0f0f] flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-red)] text-white shadow-[0_8px_24px_-12px_var(--brand-red-glow)]">
              <Heart className="h-4 w-4 fill-current" />
            </span>
            <div className="leading-tight">
              <div className="font-display font-extrabold text-base tracking-tight">
                Entrium AI
              </div>
              <div className="font-mono-label text-[9px] tracking-[0.18em] text-white/50 uppercase">
                Admin · Console
              </div>
            </div>
          </Link>
        </div>

        <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-2 mb-1.5 font-mono-label text-[9px] tracking-[0.16em] text-white/35 uppercase">
                {group.label}
              </p>
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-white/75 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <Icon className="h-4 w-4 text-white/55 group-hover:text-[var(--brand-red)] transition-colors" />
                  <span className="flex-1 truncate">{label}</span>
                  <ChevronRight className="h-3 w-3 text-white/20 group-hover:text-white/50 transition-colors" />
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-3 py-3 space-y-1.5">
          <div className="px-2.5 py-1">
            <div className="font-mono-label text-[9px] uppercase tracking-wider text-white/40">
              Signed in as
            </div>
            <div className="text-xs text-white/85 truncate">{admin.email}</div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <ChevronRight className="h-3 w-3 rotate-180" />
            Назад в платформу
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-white/55 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="px-6 lg:px-10 py-8">{children}</div>
      </main>
    </div>
  )
}
