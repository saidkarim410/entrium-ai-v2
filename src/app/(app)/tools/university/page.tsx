import { UniversityTool } from "./university-tool"

export default function UniversityPage() {
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 shrink-0">
        <div>
          <h1 className="font-display text-lg tracking-tight">University Advisor</h1>
          <p className="font-mono-label text-cream-3 mt-0.5">AI · Подбор универов из QS базы (Safety / Match / Reach)</p>
        </div>
      </header>
      <UniversityTool />
    </>
  )
}
