import crypto from "node:crypto"
import { z } from "zod"
import { getCurrentUser } from "@/lib/supabase/server"
import { env } from "@/lib/env"
import { SETUP_MIGRATIONS } from "@/lib/setup/migrations-data"

export const runtime = "nodejs"
export const maxDuration = 120

const schema = z.object({
  supabaseToken: z.string().min(10),
  vercelToken: z.string().min(10),
  tgBotToken: z.string().optional(),
  resendKey: z.string().optional(),
})

type Step = { step: string; ok: boolean; message: string; details?: string[] }

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_REF = SUPABASE_URL.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? ""
const SITE_URL = (env.NEXT_PUBLIC_SITE_URL ?? "https://entrium-ai-v2.vercel.app").replace(/\/$/, "")
const VERCEL_PROJECT_NAME = "entrium-ai-v2"

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ success: false, steps: [], message: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ success: false, steps: [], message: "Invalid input" }, { status: 400 })
  }

  const { supabaseToken, vercelToken, tgBotToken, resendKey } = parsed.data
  const steps: Step[] = []

  // ── Step 1: Apply migrations ────────────────────────────────────
  steps.push(await applyMigrations(supabaseToken))

  // ── Step 2: Generate secrets ───────────────────────────────────
  const tgWebhookSecret = randomSecret(32)
  const cronSecret = randomSecret(32)
  const emailTokenSecret = randomSecret(48)

  // ── Step 3: Get Vercel project info ────────────────────────────
  const projectInfo = await getVercelProject(vercelToken, VERCEL_PROJECT_NAME)
  if (!projectInfo.ok) {
    steps.push({
      step: "Vercel: проект найден",
      ok: false,
      message: projectInfo.error ?? "Не удалось найти проект",
    })
    return Response.json({ success: false, steps })
  }
  steps.push({
    step: "Vercel: проект найден",
    ok: true,
    message: `${projectInfo.name} (id: ${projectInfo.id.slice(0, 12)}...)`,
  })

  // ── Step 4: Set Vercel env vars ────────────────────────────────
  const envsToSet: Array<{ key: string; value: string; type?: "encrypted" | "plain" }> = [
    { key: "TELEGRAM_BOT_TOKEN", value: (tgBotToken ?? "").trim(), type: "encrypted" },
    { key: "TELEGRAM_WEBHOOK_SECRET", value: tgWebhookSecret, type: "encrypted" },
    { key: "CRON_SECRET", value: cronSecret, type: "encrypted" },
    { key: "EMAIL_TOKEN_SECRET", value: emailTokenSecret, type: "encrypted" },
  ]
  if (resendKey?.trim()) {
    envsToSet.push({ key: "RESEND_API_KEY", value: resendKey.trim(), type: "encrypted" })
  }

  const envResult = await setVercelEnvVars(
    vercelToken,
    projectInfo.id,
    projectInfo.teamId,
    envsToSet.filter((e) => e.value.length > 0)
  )
  steps.push(envResult)

  // ── Step 5: Trigger redeploy ───────────────────────────────────
  const redeployResult = await redeployVercel(vercelToken, projectInfo.id, projectInfo.teamId, projectInfo.repoBranch)
  steps.push(redeployResult)

  // ── Step 6: Register Telegram webhook ──────────────────────────
  if (tgBotToken?.trim()) {
    const tgResult = await setTelegramWebhook(tgBotToken.trim(), tgWebhookSecret)
    steps.push(tgResult)
  } else {
    steps.push({
      step: "Telegram: webhook",
      ok: true,
      message: "Пропущено — bot token не указан",
    })
  }

  const success = steps.every((s) => s.ok)
  return Response.json({ success, steps })
}

// ── Step implementations ──────────────────────────────────────────────────

async function applyMigrations(token: string): Promise<Step> {
  if (!SUPABASE_REF) {
    return {
      step: "Supabase: миграции",
      ok: false,
      message: "Не удалось определить project ref из NEXT_PUBLIC_SUPABASE_URL",
    }
  }

  const details: string[] = []
  for (const m of SETUP_MIGRATIONS) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_REF}/database/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: m.sql }),
      })

      if (!res.ok) {
        const errText = await res.text()
        return {
          step: "Supabase: миграции",
          ok: false,
          message: `${m.name} упала (HTTP ${res.status})`,
          details: [...details, `${m.name}: ${truncate(errText, 300)}`],
        }
      }
      details.push(`${m.name} ✓`)
    } catch (err) {
      return {
        step: "Supabase: миграции",
        ok: false,
        message: `${m.name} — fetch error`,
        details: [...details, `${m.name}: ${err instanceof Error ? err.message : "fetch failed"}`],
      }
    }
  }

  return {
    step: "Supabase: миграции применены",
    ok: true,
    message: `${SETUP_MIGRATIONS.length} миграций выполнено`,
    details,
  }
}

type ProjectInfo = {
  ok: boolean
  id: string
  name: string
  teamId?: string
  repoBranch?: string
  error?: string
}

async function getVercelProject(token: string, name: string): Promise<ProjectInfo> {
  // First, find the project across all teams
  // Try personal account first
  const personal = await fetchVercelProject(token, name)
  if (personal.ok) return personal

  // Try teams
  const teamsRes = await fetch("https://api.vercel.com/v2/teams", {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!teamsRes.ok) {
    return { ok: false, id: "", name: "", error: `teams list HTTP ${teamsRes.status}` }
  }
  const teamsData = await teamsRes.json() as { teams: Array<{ id: string; slug: string }> }

  for (const team of teamsData.teams ?? []) {
    const found = await fetchVercelProject(token, name, team.id)
    if (found.ok) {
      return { ...found, teamId: team.id }
    }
  }

  return { ok: false, id: "", name: "", error: `проект "${name}" не найден` }
}

async function fetchVercelProject(
  token: string,
  name: string,
  teamId?: string
): Promise<ProjectInfo> {
  const params = new URLSearchParams({ search: name })
  if (teamId) params.set("teamId", teamId)
  const res = await fetch(`https://api.vercel.com/v9/projects?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return { ok: false, id: "", name: "", error: `HTTP ${res.status}` }
  const data = (await res.json()) as { projects?: Array<{ id: string; name: string; link?: { type: string; productionBranch?: string } }> }
  const project = data.projects?.find((p) => p.name === name)
  if (!project) return { ok: false, id: "", name: "", error: "not_found" }
  return {
    ok: true,
    id: project.id,
    name: project.name,
    teamId,
    repoBranch: project.link?.productionBranch ?? "main",
  }
}

async function setVercelEnvVars(
  token: string,
  projectId: string,
  teamId: string | undefined,
  envs: Array<{ key: string; value: string; type?: "encrypted" | "plain" }>
): Promise<Step> {
  const details: string[] = []
  let okCount = 0

  for (const ev of envs) {
    // Try to delete existing first (Vercel API requires upsert via delete + create)
    const listRes = await fetch(
      `https://api.vercel.com/v9/projects/${projectId}/env?${teamId ? `teamId=${teamId}` : ""}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (listRes.ok) {
      const list = (await listRes.json()) as { envs?: Array<{ id: string; key: string; target?: string[] }> }
      const existing = list.envs?.filter((e) => e.key === ev.key && (e.target?.includes("production") ?? false))
      for (const ex of existing ?? []) {
        await fetch(
          `https://api.vercel.com/v9/projects/${projectId}/env/${ex.id}?${teamId ? `teamId=${teamId}` : ""}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
        )
      }
    }

    const url = `https://api.vercel.com/v10/projects/${projectId}/env?${teamId ? `teamId=${teamId}` : ""}`
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: ev.key,
        value: ev.value,
        type: ev.type ?? "encrypted",
        target: ["production", "preview", "development"],
      }),
    })

    if (res.ok) {
      okCount++
      details.push(`${ev.key} ✓`)
    } else {
      const err = await res.text()
      details.push(`${ev.key} ✗ ${truncate(err, 100)}`)
    }
  }

  return {
    step: "Vercel: env vars",
    ok: okCount === envs.length,
    message: `${okCount}/${envs.length} переменных установлено`,
    details,
  }
}

async function redeployVercel(
  token: string,
  projectId: string,
  teamId: string | undefined,
  branch: string = "main"
): Promise<Step> {
  // Get the latest deployment to know which commit/git ref to redeploy
  const listRes = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1${teamId ? `&teamId=${teamId}` : ""}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!listRes.ok) {
    return {
      step: "Vercel: redeploy",
      ok: false,
      message: `не удалось получить список деплойментов (HTTP ${listRes.status})`,
    }
  }
  const list = (await listRes.json()) as {
    deployments?: Array<{ uid: string; meta?: { githubCommitSha?: string }; name: string; target?: string }>
  }
  const last = list.deployments?.[0]

  // Use redeploy: POST /v13/deployments with the deploymentId or sha
  const url = `https://api.vercel.com/v13/deployments?${teamId ? `teamId=${teamId}` : ""}`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: VERCEL_PROJECT_NAME,
      project: projectId,
      target: "production",
      ...(last?.uid ? { deploymentId: last.uid } : {}),
      ...(last?.meta?.githubCommitSha
        ? { gitSource: { type: "github", ref: branch, sha: last.meta.githubCommitSha } }
        : {}),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return {
      step: "Vercel: redeploy",
      ok: false,
      message: `HTTP ${res.status}: ${truncate(err, 200)}`,
    }
  }
  const data = (await res.json()) as { url?: string }
  return {
    step: "Vercel: redeploy запущен",
    ok: true,
    message: "новые env vars подхватятся за ~1-2 минуты",
    details: data.url ? [`https://${data.url}`] : undefined,
  }
}

async function setTelegramWebhook(botToken: string, secret: string): Promise<Step> {
  const webhookUrl = `${SITE_URL}/api/telegram/webhook`
  const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  })
  const data = (await res.json()) as { ok: boolean; description?: string }
  if (!data.ok) {
    return {
      step: "Telegram: webhook",
      ok: false,
      message: data.description ?? `HTTP ${res.status}`,
    }
  }
  return {
    step: "Telegram: webhook зарегистрирован",
    ok: true,
    message: webhookUrl,
    details: ["Открой @entriumleedbot и пошли /start — должен ответить"],
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function randomSecret(len: number): string {
  return crypto.randomBytes(len).toString("base64url").slice(0, len)
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "..." : s
}
