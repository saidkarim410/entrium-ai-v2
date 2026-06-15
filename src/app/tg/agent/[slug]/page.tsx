import Link from "next/link"
import { notFound } from "next/navigation"
import { getT } from "@/lib/i18n/server"
import { findAgent } from "@/lib/agents/registry"
import { AgentChat } from "@/components/tg/agent-chat"

export const dynamic = "force-dynamic"

export default async function TgAgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const agent = findAgent(slug)
  if (!agent) notFound()

  const t = await getT()
  const meta = t.tools[agent.slug]

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-3 py-2 backdrop-blur">
        <Link href="/tg" aria-label="Назад" className="text-lg text-muted-foreground">
          ←
        </Link>
        <div>
          <div className="text-sm font-semibold leading-none">{meta.title}</div>
          <div className="text-[11px] text-muted-foreground">{meta.desc}</div>
        </div>
      </header>
      <AgentChat tool={agent.slug} placeholder={agent.placeholder} />
    </main>
  )
}
