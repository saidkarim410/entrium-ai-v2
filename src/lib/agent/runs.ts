import { supabaseAdmin } from "@/lib/supabase/admin"
import type { Mission } from "./missions"
import type { StepFailReason } from "./run-step"
import {
  missionStatusFrom,
  type MissionRunRecord,
  type MissionRunStatus,
  type MissionStepRecord,
} from "./run-state"

export {
  missionStatusFrom,
  type MissionRunRecord,
  type MissionRunStatus,
  type MissionStepRecord,
  type MissionStepStatus,
} from "./run-state"

/**
 * Mission run persistence (P0-01: progress survives a page refresh, a single
 * failed step can be retried, results are not duplicated in History).
 *
 * Stored in the existing `entrium.tool_runs` table — no DDL needed:
 *   tool    = "counselor"   (so History keeps showing one entry per mission)
 *   input   = { agent_mission, mission_title, run_version: 2 }
 *   output  = { text: <aggregated markdown of completed steps>, mission: MissionRunRecord }
 *   status  = pending | success | error   (table constraint)
 */

export const RUN_VERSION = 2
/** A run still marked "running" but untouched for this long is considered interrupted. */
export const STALE_RUN_MS = 6 * 60 * 1000

function aggregateText(steps: MissionStepRecord[]): string {
  return steps
    .filter((s) => s.status === "completed" && s.text)
    .map((s) => `# ${s.title}\n\n${s.text}`)
    .join("\n\n---\n\n")
}

function toolRunStatus(status: MissionRunStatus): "pending" | "success" | "error" {
  if (status === "running") return "pending"
  if (status === "failed") return "error"
  return "success"
}

export async function createMissionRun(
  userId: string,
  mission: Mission,
  meta: { model?: string; promptVersion?: string } = {}
): Promise<MissionRunRecord | null> {
  const now = new Date().toISOString()
  const record: Omit<MissionRunRecord, "id"> = {
    missionId: mission.id,
    missionTitle: mission.title,
    status: "running",
    createdAt: now,
    updatedAt: now,
    steps: mission.steps.map((s, i) => ({
      step: i + 1,
      tool: s.tool,
      title: s.title,
      description: s.description,
      status: "pending",
    })),
  }
  const { data, error } = await supabaseAdmin
    .from("tool_runs")
    .insert({
      user_id: userId,
      tool: "counselor",
      input: {
        agent_mission: mission.id,
        mission_title: mission.title,
        run_version: RUN_VERSION,
        model: meta.model ?? null,
        prompt_version: meta.promptVersion ?? null,
      },
      output: { text: "", mission: record },
      status: "pending",
      duration_ms: 0,
    })
    .select("id")
    .single()
  if (error || !data) {
    console.error("createMissionRun failed:", error)
    return null
  }
  return { id: data.id as string, ...record }
}

export async function getMissionRun(runId: string, userId: string): Promise<MissionRunRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("tool_runs")
    .select("id, output, created_at")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error || !data) return null
  const out = data.output as { mission?: MissionRunRecord } | null
  const mission = out?.mission
  if (!mission || !Array.isArray(mission.steps)) return null

  // Interrupted runs (server died, client closed the tab) must not look "running" forever.
  const stale =
    mission.status === "running" &&
    Date.now() - new Date(mission.updatedAt || data.created_at).getTime() > STALE_RUN_MS
  if (stale) {
    const steps = mission.steps.map((s): MissionStepRecord =>
      s.status === "running" || s.status === "pending"
        ? { ...s, status: "failed", reason: s.status === "running" ? "interrupted" : "skipped" }
        : s
    )
    const fixed: MissionRunRecord = { ...mission, id: data.id as string, steps, status: missionStatusFrom(steps) }
    await persist(fixed, userId)
    return fixed
  }
  return { ...mission, id: data.id as string }
}

async function persist(run: MissionRunRecord, userId: string): Promise<void> {
  const updatedAt = new Date().toISOString()
  const record: MissionRunRecord = { ...run, updatedAt }
  const { error } = await supabaseAdmin
    .from("tool_runs")
    .update({
      output: { text: aggregateText(run.steps), mission: record },
      status: toolRunStatus(run.status),
      error_message:
        run.status === "failed" || run.status === "partial"
          ? run.steps
              .filter((s) => s.status === "failed")
              .map((s) => `step ${s.step} (${s.tool}): ${s.reason ?? "failed"}`)
              .join("; ")
          : null,
    })
    .eq("id", run.id)
    .eq("user_id", userId)
  if (error) console.error("persist mission run failed:", error)
}

/** Replace one step's record and recompute the mission status. Returns the new run. */
export async function updateMissionStep(
  run: MissionRunRecord,
  userId: string,
  step: MissionStepRecord
): Promise<MissionRunRecord> {
  const steps = run.steps.map((s) => (s.step === step.step ? { ...step, updatedAt: new Date().toISOString() } : s))
  const next: MissionRunRecord = { ...run, steps, status: missionStatusFrom(steps) }
  await persist(next, userId)
  return next
}

/** Mark every not-yet-finished step as failed with `reason` (quota exhausted, abort…). */
export async function failRemainingSteps(
  run: MissionRunRecord,
  userId: string,
  reason: StepFailReason,
  fromStep?: number
): Promise<MissionRunRecord> {
  const steps = run.steps.map((s): MissionStepRecord =>
    (s.status === "pending" || s.status === "running") && (fromStep === undefined || s.step >= fromStep)
      ? { ...s, status: "failed", reason }
      : s
  )
  const next: MissionRunRecord = { ...run, steps, status: missionStatusFrom(steps) }
  await persist(next, userId)
  return next
}
