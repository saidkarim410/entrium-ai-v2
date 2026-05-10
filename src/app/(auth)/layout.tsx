import Link from "next/link"
import { Sparkles } from "lucide-react"
import { LangSwitcher } from "@/components/lang-switcher"
import { getT } from "@/lib/i18n/server"

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getT()
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col p-6 sm:p-8 lg:p-12">
        {/* Logo gets full top-row attention — language switcher moved to
            footer of the auth column where it's discoverable but not
            competing with the brand. */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>Entrium AI</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/40">
          <p className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
            © Entrium AI
          </p>
          <LangSwitcher size="sm" />
        </div>
      </div>
      <div className="hidden lg:block relative bg-muted overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(120,119,198,0.25),transparent)]" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-md text-center">
            <h2 className="text-3xl font-semibold tracking-tight">{t.auth.side_h2}</h2>
            <p className="mt-4 text-muted-foreground">{t.auth.side_sub}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
