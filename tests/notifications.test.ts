import { describe, it, expect } from "vitest"
import { TYPE_LABEL, type Notification } from "@/lib/notifications/types"

describe("Notification types", () => {
  it("TYPE_LABEL covers all 5 notification types", () => {
    const types: Notification["type"][] = ["deadline", "tip", "system", "agent_done", "referral"]
    for (const t of types) {
      expect(TYPE_LABEL[t]).toBeTruthy()
      expect(TYPE_LABEL[t].length).toBeGreaterThan(0)
    }
  })

  it("TYPE_LABEL keys match Notification type discriminator", () => {
    const labelKeys = Object.keys(TYPE_LABEL).sort()
    const expected = ["agent_done", "deadline", "referral", "system", "tip"]
    expect(labelKeys).toEqual(expected)
  })
})
