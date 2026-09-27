import { describe, it, expect } from "vitest"
import {
  classifyStepResult,
  outputBudgetFor,
  retryInstruction,
  RETRYABLE,
  describeStepFailure,
} from "@/lib/agent/run-step"
import { missionStatusFrom, type MissionStepRecord } from "@/lib/agent/run-state"

const TODAY = "2026-09-28"

describe("run-step — budgets", () => {
  it("gives the JSON plan the most room and prose tools a default", () => {
    expect(outputBudgetFor("tracker")).toBeGreaterThan(outputBudgetFor("analyzer"))
    expect(outputBudgetFor("essay")).toBe(4000)
  })
})

describe("run-step — classification (P0-01)", () => {
  it("a model cut off by the token limit is a failed step, never a result", () => {
    const r = classifyStepResult({ tool: "analyzer", text: "| Uni | ...", finishReason: "length", aborted: false, todayIso: TODAY })
    expect(r).toMatchObject({ status: "failed", reason: "truncated" })
  })

  it("client abort → aborted", () => {
    const r = classifyStepResult({ tool: "analyzer", text: "x", finishReason: "stop", aborted: true, todayIso: TODAY })
    expect(r).toMatchObject({ status: "failed", reason: "aborted" })
  })

  it("empty text → empty", () => {
    const r = classifyStepResult({ tool: "analyzer", text: "  ", finishReason: "stop", aborted: false, todayIso: TODAY })
    expect(r).toMatchObject({ status: "failed", reason: "empty" })
  })

  it("prose step that stopped on its own is completed as-is", () => {
    const r = classifyStepResult({ tool: "university", text: "## SAFETY\n…", finishReason: "stop", aborted: false, todayIso: TODAY })
    expect(r).toMatchObject({ status: "completed", text: "## SAFETY\n…" })
  })

  it("tracker step must validate; canonical JSON is returned", () => {
    const good = JSON.stringify({
      diagnosis: "d", score: 60,
      months: [{ month: "Октябрь 2026", tasks: [{ title: "IELTS", deadline: "2026-10-20", priority: "high", category: "tests" }] }],
    })
    const r = classifyStepResult({ tool: "tracker", text: "```json\n" + good + "\n```", finishReason: "stop", aborted: false, todayIso: TODAY })
    expect(r.status).toBe("completed")
    if (r.status === "completed") {
      expect(JSON.parse(r.text).months[0].tasks[0].id).toBe("t1")
      expect(r.plan?.months).toHaveLength(1)
    }

    const bad = classifyStepResult({ tool: "tracker", text: "{\"months\": [", finishReason: "stop", aborted: false, todayIso: TODAY })
    expect(bad).toMatchObject({ status: "failed", reason: "invalid_json" })
  })

  it("only technical failures are retried", () => {
    expect(RETRYABLE.has("truncated")).toBe(true)
    expect(RETRYABLE.has("invalid_json")).toBe(true)
    expect(RETRYABLE.has("aborted")).toBe(false)
    expect(RETRYABLE.has("quota")).toBe(false)
  })

  it("retry instruction asks for compact output", () => {
    expect(retryInstruction("truncated", "analyzer")).toContain("компактнее")
    expect(retryInstruction("invalid_json", "tracker")).toContain("валидным JSON")
  })

  it("every reason has a human message", () => {
    for (const reason of ["truncated", "invalid_json", "empty", "aborted", "model_error", "quota"] as const) {
      expect(describeStepFailure(reason).length).toBeGreaterThan(10)
    }
  })
})

describe("runs — mission status from steps", () => {
  const step = (n: number, status: MissionStepRecord["status"]): MissionStepRecord => ({
    step: n, tool: "analyzer", title: `s${n}`, description: "", status,
  })

  it("is running while anything is pending or running", () => {
    expect(missionStatusFrom([step(1, "completed"), step(2, "pending")])).toBe("running")
    expect(missionStatusFrom([step(1, "running")])).toBe("running")
  })

  it("completed only when every step completed; partial otherwise", () => {
    expect(missionStatusFrom([step(1, "completed"), step(2, "completed")])).toBe("completed")
    expect(missionStatusFrom([step(1, "completed"), step(2, "failed")])).toBe("partial")
    expect(missionStatusFrom([step(1, "failed"), step(2, "failed")])).toBe("failed")
  })
})
