/**
 * Documents domain types + constants.
 *
 * Lives outside actions.ts because Next.js bans non-async exports
 * from "use server" files. Importable from both server and client.
 */

export type DocumentRow = {
  id: string
  user_id: string
  storage_path: string
  kind: string
  label: string | null
  size_bytes: number | null
  mime_type: string | null
  recommender_invite_id: string | null
  created_at: string
}

export const ALLOWED_KINDS = [
  "transcript",
  "certificate",
  "recommendation",
  "cv",
  "other",
] as const
export type DocumentKind = (typeof ALLOWED_KINDS)[number]

export const KIND_LABELS: Record<DocumentKind, string> = {
  transcript: "Транскрипт",
  certificate: "Сертификат",
  recommendation: "Рекомендация",
  cv: "CV / Резюме",
  other: "Другое",
}

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024
export const ALLOWED_DOCUMENT_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"]
