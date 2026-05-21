import Link from "next/link"
import { Heart, Users, CreditCard, BarChart3, Activity, Mail } from "lucide-react"
import { requireAdminPage } from "@/lib/admin/auth"

export const dynamic = "force-dynamic"

const NAV = [
  { href: "/admin", label: "Обзор", icon: BarChart3 },
  { href: "/admin/users", label: "Пользователи", icon: Users },
  { href: "/admin/payments", label: "Оплаты", icon: CreditCard },
  { href: "/admin/audit", label: "Audit log", icon: Activity },
  { href: "/admin/email-preview", label: "Email превью", icon: Mail },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage()

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-2 font-display text-lg">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--brand-red)] text-white">
            <Heart className="h-3.5 w-3.5 fill-current" />
          </span>
          Entrium AI · Admin
        </div>
        <div className="font-mono-label text-foreground/60 text-[10px]">
          {admin.email}
        </div>
      </header>
      <nav className="border-b border-border bg-card/30">
        <div className="px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-mono-label text-foreground/70 hover:text-[var(--brand-red)] border-b-2 border-transparent hover:border-[var(--brand-red)] transition-colors whitespace-nowrap"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
