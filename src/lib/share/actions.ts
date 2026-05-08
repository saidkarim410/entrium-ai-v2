"use server"

import { revalidatePath } from "next/cache"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"

export type Visibility = "private" | "unlisted" | "public"

export type SharingStatus = {
  visibility: Visibility
  slug: string | null
  link: string
  views: number
}

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://entrium-ai-v2.vercel.app").replace(/\/$/, "")

export async function getSharingStatus(): Promise<SharingStatus> {
  const user = await getCurrentUser()
  if (!user) {
    return { visibility: "private", slug: null, link: "", views: 0 }
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("public_slug, public_visibility, public_views")
    .eq("id", user.id)
    .maybeSingle()

  return {
    visibility: ((data?.public_visibility as Visibility | undefined) ?? "private") as Visibility,
    slug: (data?.public_slug as string | null) ?? null,
    link: data?.public_slug ? `${SITE}/p/${data.public_slug}` : "",
    views: (data?.public_views as number | null) ?? 0,
  }
}

export async function enableSharing(
  visibility: "unlisted" | "public",
  customSlug?: string
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  // Use existing slug if any, else generate
  const { data: cur } = await supabaseAdmin
    .from("profiles")
    .select("public_slug, full_name")
    .eq("id", user.id)
    .maybeSingle()

  let slug = cur?.public_slug ?? null
  if (customSlug?.trim()) {
    slug = sanitizeSlug(customSlug)
  } else if (!slug) {
    slug = await generateUniqueSlug(cur?.full_name ?? null)
  }

  if (!slug) return { ok: false, error: "could_not_generate_slug" }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      public_slug: slug,
      public_visibility: visibility,
    })
    .eq("id", user.id)

  if (error) {
    if (error.code === "23505") return { ok: false, error: "slug_taken" }
    return { ok: false, error: error.message }
  }

  revalidatePath("/settings")
  revalidatePath(`/p/${slug}`)
  return { ok: true, slug }
}

export async function disableSharing(): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ public_visibility: "private" })
    .eq("id", user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath("/settings")
  return { ok: true }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function sanitizeSlug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}

async function generateUniqueSlug(fullName: string | null): Promise<string | null> {
  const base =
    fullName && fullName.trim()
      ? sanitizeSlug(fullName).slice(0, 24)
      : "applicant"

  for (let i = 0; i < 5; i++) {
    const suffix = randomSuffix()
    const candidate = `${base || "applicant"}-${suffix}`.replace(/^-+/, "")

    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("public_slug", candidate)
      .maybeSingle()

    if (!data) return candidate
  }
  return null
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6)
}
