"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { ESSAY_STATUSES, wordCount, type Essay, type EssayStatus, type EssayRevision } from "./types"

export async function listEssays(): Promise<Essay[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data } = await supabaseAdmin
    .from("application_essays")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  return (data ?? []) as Essay[]
}

export async function getEssay(id: string): Promise<Essay | null> {
  const user = await getCurrentUser()
  if (!user) return null
  const { data } = await supabaseAdmin
    .from("application_essays")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  return (data as Essay) ?? null
}

export async function listEssayRevisions(essayId: string): Promise<EssayRevision[]> {
  const user = await getCurrentUser()
  if (!user) return []
  // RLS allows owner; we still check via admin for defense-in-depth
  const { data: essay } = await supabaseAdmin
    .from("application_essays")
    .select("id")
    .eq("id", essayId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!essay) return []

  const { data } = await supabaseAdmin
    .from("essay_revisions")
    .select("*")
    .eq("essay_id", essayId)
    .order("created_at", { ascending: false })
    .limit(50)

  return (data ?? []) as EssayRevision[]
}

export async function createEssay(input: {
  title: string
  prompt?: string
  word_limit?: number
  application_id?: string | null
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }
  if (!input.title.trim()) return { ok: false, error: "title_required" }

  const { data, error } = await supabaseAdmin
    .from("application_essays")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      prompt: input.prompt?.trim() || null,
      word_limit: input.word_limit ?? null,
      application_id: input.application_id ?? null,
      status: "draft",
      draft_text: "",
    })
    .select("id")
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath("/essays")
  return { ok: true, id: data.id as string }
}

const REVISION_DEBOUNCE_MS = 2 * 60 * 1000 // 2 minutes between snapshots

export async function saveEssayDraft(
  id: string,
  draft: string
): Promise<{ ok: boolean; revisioned: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, revisioned: false, error: "unauthorized" }

  // Read current state to decide whether to snapshot
  const { data: cur } = await supabaseAdmin
    .from("application_essays")
    .select("draft_text, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!cur) return { ok: false, revisioned: false, error: "not_found" }
  const prev = (cur.draft_text as string) ?? ""

  // Update draft
  const { error } = await supabaseAdmin
    .from("application_essays")
    .update({ draft_text: draft })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { ok: false, revisioned: false, error: error.message }

  // Snapshot only if content actually changed AND last revision is old enough
  let revisioned = false
  if (draft !== prev && draft.trim().length > 0) {
    const { data: lastRev } = await supabaseAdmin
      .from("essay_revisions")
      .select("created_at")
      .eq("essay_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastTs = lastRev?.created_at ? new Date(lastRev.created_at as string).getTime() : 0
    if (Date.now() - lastTs > REVISION_DEBOUNCE_MS) {
      await supabaseAdmin.from("essay_revisions").insert({
        essay_id: id,
        content: draft,
        word_count: wordCount(draft),
      })
      revisioned = true
    }
  }

  revalidatePath("/essays")
  revalidatePath(`/essays/${id}`)
  return { ok: true, revisioned }
}

export async function updateEssayMeta(
  id: string,
  patch: Partial<Pick<Essay, "title" | "prompt" | "word_limit" | "status" | "application_id">>
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const clean: Record<string, unknown> = {}
  if (patch.title !== undefined) clean.title = patch.title.trim()
  if (patch.prompt !== undefined) clean.prompt = patch.prompt?.trim() || null
  if (patch.word_limit !== undefined) clean.word_limit = patch.word_limit
  if (patch.status !== undefined && ESSAY_STATUSES.includes(patch.status as EssayStatus)) {
    clean.status = patch.status
  }
  if (patch.application_id !== undefined) clean.application_id = patch.application_id

  const { error } = await supabaseAdmin
    .from("application_essays")
    .update(clean)
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/essays")
  revalidatePath(`/essays/${id}`)
  return { ok: true }
}

export async function deleteEssay(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { error } = await supabaseAdmin
    .from("application_essays")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/essays")
  return { ok: true }
}

export async function restoreRevision(
  essayId: string,
  revisionId: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { data: rev } = await supabaseAdmin
    .from("essay_revisions")
    .select("content")
    .eq("id", revisionId)
    .eq("essay_id", essayId)
    .maybeSingle()

  if (!rev) return { ok: false, error: "not_found" }

  const { error } = await supabaseAdmin
    .from("application_essays")
    .update({ draft_text: rev.content })
    .eq("id", essayId)
    .eq("user_id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/essays/${essayId}`)
  return { ok: true }
}
