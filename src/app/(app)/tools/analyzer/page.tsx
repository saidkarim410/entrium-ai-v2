import { AnalyzerTool } from "./analyzer-tool"

export default function AnalyzerPage() {
  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border/40 px-6 shrink-0">
        <div>
          <h1 className="font-display text-lg tracking-tight">Chances Analyzer</h1>
          <p className="font-mono-label text-cream-3 mt-0.5">AI · Реалистичная оценка шансов поступления</p>
        </div>
      </header>
      <AnalyzerTool />
    </>
  )
}
