import { describe, it, expect } from "vitest"
import { AGENTS, findAgent } from "@/lib/agents/registry"

describe("agents registry", () => {
  it("has 14 unique agents", () => {
    expect(AGENTS).toHaveLength(14)
    expect(new Set(AGENTS.map((a) => a.slug)).size).toBe(14)
  })

  it("findAgent resolves a known slug and rejects unknown", () => {
    expect(findAgent("essay")?.slug).toBe("essay")
    expect(findAgent("nope")).toBeUndefined()
  })

  it("every agent has a non-empty placeholder", () => {
    for (const a of AGENTS) expect(a.placeholder.length).toBeGreaterThan(0)
  })
})
