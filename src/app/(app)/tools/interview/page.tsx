import { InterviewTool } from "./interview-tool"

export default function InterviewPage() {
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 shrink-0">
        <div>
          <h1 className="font-display text-lg tracking-tight">Interview Trainer</h1>
          <p className="font-mono-label text-cream-3 mt-0.5">AI · Тренировка admission interview</p>
        </div>
      </header>
      <InterviewTool />
    </>
  )
}
