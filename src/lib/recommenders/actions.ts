"use server"

import { revalidatePath } from "next/cache"
import crypto from "node:crypto"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { getCurrentUser } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/email"
import { env, emailEnabled } from "@/lib/env"
import type { RecommenderInvite } from "./types"

/**
 * F-2 (TZ): server actions for the recommender flow.
 *
 * The student creates an invite with the recommender's name + email.
 * We send the recommender an email with a one-time URL containing a
 * 32-byte token. They open /r/[token], type a short message, and
 * upload a PDF. The PDF is stored in the student's folder under
 * documents/<student_id>/recommendations/, indexed in entrium.documents
 * with `recommender_invite_id` set. Tokens expire 60 days after creation.
 *
 * Type lives in ./types.ts because "use server" files can only export
 * async functions.
 */

export async function listRecommenderInvites(): Promise<RecommenderInvite[]> {
  const user = await getCurrentUser()
  if (!user) return []
  const { data, error } = await supabaseAdmin
    .from("recommender_invites")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("listRecommenderInvites:", error)
    return []
  }
  return (data ?? []) as RecommenderInvite[]
}

export async function createRecommenderInvite(params: {
  recommenderName: string
  recommenderEmail: string
  recommenderRole?: string
  message?: string
}): Promise<{ ok: boolean; id?: string; token?: string; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  if (!params.recommenderName.trim() || !params.recommenderEmail.trim()) {
    return { ok: false, error: "Имя и email обязательны" }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.recommenderEmail)) {
    return { ok: false, error: "Невалидный email" }
  }

  // 32-byte token = 256 bits of entropy → URL-safe base64 length 43
  const token = crypto.randomBytes(32).toString("base64url")

  const { data, error } = await supabaseAdmin
    .from("recommender_invites")
    .insert({
      user_id: user.id,
      recommender_name: params.recommenderName.trim(),
      recommender_email: params.recommenderEmail.trim().toLowerCase(),
      recommender_role: params.recommenderRole?.trim() || null,
      token,
      message: params.message?.trim() || null,
    })
    .select("id, token")
    .single()

  if (error) return { ok: false, error: error.message }

  // Fire-and-forget email — student sees "appointment created" even if
  // email service is down; they can copy the link manually as fallback.
  if (emailEnabled()) {
    const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
    const link = `${site}/r/${token}`

    // Profile name for "from {studentName}"
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle()
    const studentName = profile?.full_name ?? user.email ?? "студент Entrium"

    sendEmail({
      to: params.recommenderEmail,
      subject: `${studentName} просит рекомендательное письмо`,
      html: buildInviteEmail({
        recommenderName: params.recommenderName,
        studentName,
        message: params.message,
        link,
      }),
    }).catch((err) => console.error("Recommender email send failed:", err))
  }

  revalidatePath("/settings")
  return { ok: true, id: data.id as string, token: data.token as string }
}

export async function revokeRecommenderInvite(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { error } = await supabaseAdmin
    .from("recommender_invites")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath("/settings")
  return { ok: true }
}

// ── Public actions used by /r/[token] (no auth) ────────────────────────────

export async function loadInviteByToken(token: string): Promise<
  | { ok: true; invite: { recommenderName: string; studentName: string; message: string | null; expiresAt: string } }
  | { ok: false; reason: "not_found" | "expired" | "already_submitted" }
> {
  const { data: row } = await supabaseAdmin
    .from("recommender_invites")
    .select("id, user_id, recommender_name, message, status, expires_at, submitted_at")
    .eq("token", token)
    .maybeSingle()
  if (!row) return { ok: false, reason: "not_found" }

  if (row.status === "submitted" || row.submitted_at) return { ok: false, reason: "already_submitted" }
  if (new Date(row.expires_at) < new Date()) return { ok: false, reason: "expired" }

  // Mark as opened (best-effort)
  await supabaseAdmin
    .from("recommender_invites")
    .update({ status: "opened", opened_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("opened_at", null)

  // Look up student name for the recommender's UI
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email")
    .eq("id", row.user_id)
    .maybeSingle()
  const studentName = profile?.full_name ?? profile?.email ?? "Entrium student"

  return {
    ok: true,
    invite: {
      recommenderName: row.recommender_name,
      studentName,
      message: row.message,
      expiresAt: row.expires_at,
    },
  }
}

/**
 * Generates a signed upload URL for the recommender's PDF. We can't
 * use storage RLS here (the recommender is unauthenticated), so we
 * issue the URL with the admin client and bake the path into the
 * student's folder so cleanup-by-user still works.
 */
export async function createRecommenderUploadUrl(token: string, filename: string): Promise<
  | { ok: true; signedUrl: string; path: string }
  | { ok: false; error: string }
> {
  const { data: row } = await supabaseAdmin
    .from("recommender_invites")
    .select("id, user_id, status, expires_at")
    .eq("token", token)
    .maybeSingle()
  if (!row) return { ok: false, error: "Invite not found" }
  if (row.status === "submitted") return { ok: false, error: "Already submitted" }
  if (new Date(row.expires_at) < new Date()) return { ok: false, error: "Invite expired" }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)
  const path = `${row.user_id}/recommendations/${row.id}-${safeName}`

  const { data, error } = await supabaseAdmin.storage
    .from("documents")
    .createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: error?.message ?? "Cannot create URL" }

  return { ok: true, signedUrl: data.signedUrl, path }
}

/**
 * Finalises the submission: registers the file in entrium.documents
 * and flips the invite to submitted. Called after the recommender's
 * browser successfully PUTs the file to the signed URL.
 */
export async function finalizeRecommenderSubmission(params: {
  token: string
  path: string
  size: number
  mimeType: string
  label: string
}): Promise<{ ok: boolean; error?: string }> {
  const { data: row } = await supabaseAdmin
    .from("recommender_invites")
    .select("id, user_id, recommender_name, status, expires_at")
    .eq("token", params.token)
    .maybeSingle()
  if (!row) return { ok: false, error: "Invite not found" }
  if (row.status === "submitted") return { ok: false, error: "Already submitted" }
  if (new Date(row.expires_at) < new Date()) return { ok: false, error: "Invite expired" }

  // Path must live under the student's user folder
  if (!params.path.startsWith(`${row.user_id}/`)) {
    return { ok: false, error: "Invalid path" }
  }

  await supabaseAdmin.from("documents").insert({
    user_id: row.user_id,
    storage_path: params.path,
    kind: "recommendation",
    label: `${row.recommender_name} — ${params.label}`,
    size_bytes: params.size,
    mime_type: params.mimeType,
    recommender_invite_id: row.id,
  })

  await supabaseAdmin
    .from("recommender_invites")
    .update({ status: "submitted", submitted_at: new Date().toISOString() })
    .eq("id", row.id)

  return { ok: true }
}

// ── Email template ──────────────────────────────────────────────────────────

function buildInviteEmail(params: {
  recommenderName: string
  studentName: string
  message: string | null | undefined
  link: string
}): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;color:#fce8b8">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <h1 style="font-family:Playfair Display,Georgia,serif;color:#fce8b8;font-size:24px;margin:0 0 8px">
      Запрос на рекомендательное письмо
    </h1>
    <p style="color:#d4c8a8;font-size:14px;line-height:1.6">
      Здравствуйте, ${escapeHtml(params.recommenderName)}.
    </p>
    <p style="color:#d4c8a8;font-size:14px;line-height:1.6">
      <strong>${escapeHtml(params.studentName)}</strong> подаёт документы в зарубежные университеты
      и просит вас написать рекомендательное письмо.
    </p>
    ${params.message ? `<blockquote style="border-left:3px solid #c9a84c;padding:8px 14px;margin:14px 0;color:#fce8b8;font-style:italic">${escapeHtml(params.message)}</blockquote>` : ""}
    <p style="color:#d4c8a8;font-size:14px;line-height:1.6">
      Для удобства вы можете загрузить готовое письмо одним кликом — без регистрации:
    </p>
    <a href="${params.link}" style="display:inline-block;padding:12px 24px;background:#c9a84c;color:#0a0a0a;text-decoration:none;border-radius:8px;font-weight:600;margin:8px 0 20px">
      Загрузить рекомендацию →
    </a>
    <p style="color:rgba(252,232,184,0.5);font-size:12px;line-height:1.5">
      Ссылка работает 60 дней. Если ссылка не открывается — скопируйте её в адресную строку:<br>
      <span style="word-break:break-all">${params.link}</span>
    </p>
    <p style="color:rgba(252,232,184,0.4);font-size:11px;margin-top:24px;border-top:1px solid rgba(252,232,184,0.1);padding-top:14px">
      Это письмо отправлено через Entrium AI — платформу для поступления.
      Если вы не ожидали этого запроса, просто проигнорируйте его.
    </p>
  </div>
</body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
