import Link from "next/link"
import { notFound } from "next/navigation"
import { getEssay, listEssayRevisions } from "@/lib/essays/actions"
import { listApplications } from "@/lib/applications/actions"
import { ArrowLeft } from "lucide-react"
import { EssayEditor } from "./essay-editor"

export const dynamic = "force-dynamic"

export default async function EssayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [essay, revisions, apps] = await Promise.all([
    getEssay(id),
    listEssayRevisions(id),
    listApplications(),
  ])

  if (!essay) notFound()

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden gap-3">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <Link href="/essays" className="text-cream-3 hover:text-gold transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base sm:text-lg tracking-tight truncate">{essay.title}</h1>
            <p className="font-mono-label text-cream-3 mt-0.5 truncate">
              {revisions.length} revision{revisions.length === 1 ? "" : "s"} · автосохранение каждые 1.5 сек
            </p>
          </div>
        </div>
      </header>
      <EssayEditor initial={essay} initialRevisions={revisions} apps={apps} />
    </>
  )
}
