import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { getT } from "@/lib/i18n/server"
import { Sparkles } from "lucide-react"

export default async function NotFound() {
  const t = await getT()
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent">
        <Sparkles className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">{t.common.not_found_title}</h1>
      <p className="mt-3 text-muted-foreground max-w-md">{t.common.not_found_sub}</p>
      <Link href="/" className={buttonVariants({ className: "mt-8" })}>
        {t.common.back_home}
      </Link>
    </div>
  )
}
