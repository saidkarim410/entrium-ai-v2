"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"

export type FavoriteKind = "university" | "scholarship"

export async function listFavoriteIds(kind: FavoriteKind): Promise<string[]> {
  const user = await getCurrentUser()
  if (!user) return []

  const { data } = await supabaseAdmin
    .from("favorites")
    .select("target_id")
    .eq("user_id", user.id)
    .eq("kind", kind)

  return (data ?? []).map((r) => r.target_id as string)
}

export async function toggleFavorite(
  kind: FavoriteKind,
  targetId: string
): Promise<{ ok: boolean; isFavorited: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, isFavorited: false, error: "unauthorized" }

  // Check if exists
  const { data: existing } = await supabaseAdmin
    .from("favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", kind)
    .eq("target_id", targetId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabaseAdmin
      .from("favorites")
      .delete()
      .eq("id", existing.id)
    if (error) return { ok: false, isFavorited: true, error: error.message }
    revalidatePath("/shortlist")
    return { ok: true, isFavorited: false }
  }

  const { error } = await supabaseAdmin
    .from("favorites")
    .insert({ user_id: user.id, kind, target_id: targetId })

  if (error) return { ok: false, isFavorited: false, error: error.message }
  revalidatePath("/shortlist")
  return { ok: true, isFavorited: true }
}
