import { describe, it, expect } from "vitest"
import crypto from "node:crypto"
import { validateInitData } from "@/lib/telegram/init-data"

function signInitData(fields: Record<string, string>, botToken: string): string {
  const dcs = Object.entries(fields).map(([k, v]) => `${k}=${v}`).sort().join("\n")
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()
  const hash = crypto.createHmac("sha256", secret).update(dcs).digest("hex")
  const p = new URLSearchParams(fields)
  p.set("hash", hash)
  return p.toString()
}

const TOKEN = "123456:TESTTOKEN"
const NOW = 1_700_000_000

describe("validateInitData", () => {
  it("accepts a correctly signed payload", () => {
    const initData = signInitData(
      { auth_date: String(NOW), user: JSON.stringify({ id: 42, username: "sa" }) },
      TOKEN,
    )
    const r = validateInitData(initData, TOKEN, 86_400, NOW + 10)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.user.id).toBe(42)
  })

  it("rejects a tampered hash", () => {
    const initData = signInitData({ auth_date: String(NOW), user: JSON.stringify({ id: 42 }) }, TOKEN)
    const r = validateInitData(initData.replace(/hash=[0-9a-f]+/, "hash=deadbeef"), TOKEN, 86_400, NOW + 10)
    expect(r.ok).toBe(false)
  })

  it("rejects an expired payload", () => {
    const initData = signInitData({ auth_date: String(NOW), user: JSON.stringify({ id: 42 }) }, TOKEN)
    const r = validateInitData(initData, TOKEN, 3_600, NOW + 7_200)
    expect(r).toMatchObject({ ok: false, reason: "expired" })
  })
})
