import type { MissionId } from "./missions"
import type { StepFailReason } from "./run-step"

/** Pure types + status arithmetic for mission runs (no I/O — safe for client and tests). */

export type MissionStepStatus = "pending" | "running" | "completed" | "failed"

export type MissionStepRecord = {
  step: number
  tool: string
  title: string
  description: string
  status: MissionStepStatus
  text?: string
  reason?: StepFailReason
  detail?: string
  attempts?: number
  warnings?: string[]
  updatedAt?: string
}

export type MissionRunStatus = "running" | "completed" | "partial" | "failed"

export type MissionRunRecord = {
  id: string
  missionId: MissionId
  missionTitle: string
  status: MissionRunStatus
  steps: MissionStepRecord[]
  createdAt: string
  updatedAt: string
}

export function missionStatusFrom(steps: MissionStepRecord[]): MissionRunStatus {
  if (steps.some((s) => s.status === "running" || s.status === "pending")) return "running"
  const completed = steps.filter((s) => s.status === "completed").length
  if (completed === steps.length) return "completed"
  if (completed === 0) return "failed"
  return "partial"
}
