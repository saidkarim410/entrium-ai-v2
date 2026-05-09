import Link from "next/link"
import { listEssays } from "@/lib/essays/actions"
import { listApplications } from "@/lib/applications/actions"
import { EssaysClient } from "./essays-client"

export const dynamic = "force-dynamic"

export default async function EssaysPage() {
  const [essays, apps] = await Promise.all([listEssays(), listApplications()])

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Essays</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">
            {essays.length} {essays.length === 1 ? "эссе" : "эссе"} · revision history · AI review
          </p>
        </div>
        <Link
          href="/tools/essay"
          className="font-mono-label text-xs text-cream-3 hover:text-gold transition-colors"
        >
          Essay Coach →
        </Link>
      </header>
      <EssaysClient initial={essays} apps={apps} />
    </>
  )
}
