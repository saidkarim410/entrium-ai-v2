import Link from "next/link"
import { notFound } from "next/navigation"
import { findMission } from "@/lib/agent/missions"
import { MissionRun } from "@/components/tg/mission-run"

export const dynamic = "force-dynamic"

export default async function TgMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mission = findMission(id)
  if (!mission) notFound()

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-3 py-2 backdrop-blur">
        <Link href="/tg" aria-label="Назад" className="text-lg text-muted-foreground">
          ←
        </Link>
        <div>
          <div className="text-sm font-semibold leading-none">{mission.title}</div>
          <div className="text-[11px] text-muted-foreground">{mission.subtitle}</div>
        </div>
      </header>
      <MissionRun
        missionId={mission.id}
        title={mission.title}
        subtitle={mission.subtitle}
        steps={mission.steps.map((s) => ({ title: s.title, description: s.description }))}
      />
    </main>
  )
}
