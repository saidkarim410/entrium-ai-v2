"use client"

import { Button } from "@/components/ui/button"
import { Printer, Download, Copy, Check } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

/**
 * Generic export buttons row for AI outputs.
 *
 * - Print/PDF: triggers window.print() — page-level CSS in globals.css hides
 *   everything except .print-area; user can save as PDF in browser dialog.
 * - Download .md: saves the raw text as a markdown file.
 * - Copy: copies text to clipboard.
 *
 * Wrap your AI-generated content in a div with className="print-area" so it
 * renders cleanly in print mode (white bg, black text, no borders/shadows).
 */
export function ExportButtons({
  text,
  filename = "entrium-export",
  className = "",
}: {
  /** The raw text content (markdown) to export */
  text: string
  /** Base filename without extension */
  filename?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(text)
    setCopied(true)
    toast.success("Скопировано")
    setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function print() {
    window.print()
  }

  return (
    <div className={`flex flex-wrap gap-2 print-hide ${className}`}>
      <Button variant="outline" size="sm" onClick={print} className="gap-1.5">
        <Printer className="h-3.5 w-3.5" />
        PDF / Print
      </Button>
      <Button variant="outline" size="sm" onClick={download} className="gap-1.5">
        <Download className="h-3.5 w-3.5" />
        .md
      </Button>
      <Button variant="ghost" size="sm" onClick={copy} className="gap-1.5">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Скопировано" : "Копировать"}
      </Button>
    </div>
  )
}
