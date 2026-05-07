import { TrackerTool } from "./tracker-tool"

export default function TrackerPage() {
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 shrink-0">
        <div>
          <h1 className="font-display text-lg tracking-tight">Personal Tracker</h1>
          <p className="font-mono-label text-cream-3 mt-0.5">AI · Персональный план месяц за месяцем</p>
        </div>
      </header>
      <TrackerTool />
    </>
  )
}
