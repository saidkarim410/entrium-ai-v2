"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import {
  ALLOWED_KINDS,
  ALLOWED_DOCUMENT_MIME,
  MAX_DOCUMENT_BYTES,
  type DocumentKind,
  type DocumentRow,
} from "./types"

/**
 * F-1 (TZ): server actions for student document upload + management.
 * Constants and types live in ./types.ts so this "use server" file
 * exports only async functions (Next.js requirement).
 *
 * Storage layout: documents/<user_id>/<uuid>-<filename>
 */

export async function listDocuments(): Promise<DocumentRow[]> {
  const user = await getCurrentUser()
  if (!user) return []
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("listDocuments:", error)
    return []
  }
  return (data ?? []) as DocumentRow[]
}

export async function createUploadUrl(params: {
  filename: string
  kind: DocumentKind
  size: number
  mimeType: string
}): Promise<{ ok: true; signedUrl: string; token: string; path: string } | { ok: false; error: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  if (params.size > MAX_DOCUMENT_BYTES) return { ok: false, error: "Файл больше 20 МБ" }
  if (!ALLOWED_DOCUMENT_MIME.includes(params.mimeType)) {
    return { ok: false, error: "Поддерживаются только PDF / PNG / JPEG / WEBP" }
  }
  if (!ALLOWED_KINDS.includes(params.kind)) {
    return { ok: false, error: "Неизвестный тип документа" }
  }

  const safeName = params.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`

  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: error?.message ?? "Не удалось получить URL" }

  return { ok: true, signedUrl: data.signedUrl, token: data.token, path }
}

export async function registerDocument(params: {
  path: string
  kind: DocumentKind
  label: string
  size: number
  mimeType: string
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  if (!params.path.startsWith(`${user.id}/`)) {
    return { ok: false, error: "invalid_path" }
  }

  const { data, error } = await supabaseAdmin
    .from("documents")
    .insert({
      user_id: user.id,
      storage_path: params.path,
      kind: params.kind,
      label: params.label || null,
      size_bytes: params.size,
      mime_type: params.mimeType,
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/settings")
  return { ok: true, id: data.id as string }
}

export async function deleteDocument(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { data: row, error: fetchErr } = await supabaseAdmin
    .from("documents")
    .select("storage_path, user_id")
    .eq("id", id)
    .maybeSingle()

  if (fetchErr || !row) return { ok: false, error: "not_found" }
  if (row.user_id !== user.id) return { ok: false, error: "forbidden" }

  await supabaseAdmin.storage.from("documents").remove([row.storage_path])
  await supabaseAdmin.from("documents").delete().eq("id", id)
  revalidatePath("/settings")
  return { ok: true }
}

export async function getDownloadUrl(id: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { data: row } = await supabaseAdmin
    .from("documents")
    .select("storage_path, user_id")
    .eq("id", id)
    .maybeSingle()
  if (!row || row.user_id !== user.id) return { ok: false, error: "not_found" }

  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUrl(row.storage_path, 60)
  if (error || !data) return { ok: false, error: error?.message ?? "Не удалось" }
  return { ok: true, url: data.signedUrl }
}
