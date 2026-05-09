/**
 * Application essay = a draft a user works on, optionally tied to a specific
 * application row. Revisions are full-text snapshots created when the user
 * saves (debounced) — gives a free undo timeline + lets us run AI review on
 * any past version.
 */

export const ESSAY_STATUSES = ["draft", "reviewing", "final", "submitted"] as const
export type EssayStatus = (typeof ESSAY_STATUSES)[number]

export type EssayAiReview = {
  score: number       // 0..10
  summary: string
  strengths: string[]
  weaknesses: string[]
  next_actions: string[]
  cliches: string[]
  highlight: string   // best line in the draft, verbatim
}

export type Essay = {
  id: string
  user_id: string
  application_id: string | null
  title: string
  prompt: string | null
  word_limit: number | null
  draft_text: string
  status: EssayStatus
  ai_review: EssayAiReview | null
  ai_review_at: string | null
  created_at: string
  updated_at: string
}

export type EssayRevision = {
  id: string
  essay_id: string
  content: string
  word_count: number
  ai_review: EssayAiReview | null
  created_at: string
}

export const STATUS_LABELS: Record<EssayStatus, string> = {
  draft: "Черновик",
  reviewing: "На review",
  final: "Финал",
  submitted: "Подано",
}

export const STATUS_COLORS: Record<EssayStatus, string> = {
  draft: "bg-cream-3/15 text-cream-2 border-cream-3/30",
  reviewing: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  final: "bg-gold/15 text-gold border-gold/30",
  submitted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
}

export function wordCount(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}
