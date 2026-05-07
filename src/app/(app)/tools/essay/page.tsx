import { EssayTool } from "./essay-tool"

export default function EssayPage() {
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 shrink-0">
        <div>
          <h1 className="font-display text-lg tracking-tight">Essay Coach</h1>
          <p className="font-mono-label text-cream-3 mt-0.5">AI · Эссе уровня Ivy League</p>
        </div>
      </header>
      <EssayTool />
    </>
  )
}
