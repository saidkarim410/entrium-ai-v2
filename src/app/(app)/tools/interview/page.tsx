import { InterviewTool } from "./interview-tool"

export default function InterviewPage() {
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-4 sm:px-6 shrink-0 overflow-hidden">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-base sm:text-lg tracking-tight truncate">Interview Trainer</h1>
          <p className="font-mono-label text-cream-3 mt-0.5 truncate">AI · Тренировка admission interview</p>
        </div>
      </header>
      <InterviewTool />
    </>
  )
}
