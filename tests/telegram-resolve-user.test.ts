import { describe, it, expect, vi, beforeEach } from "vitest"

const maybeSingle = vi.fn()
const eqUpdate = vi.fn().mockResolvedValue({ data: null, error: null })
const createUser = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      update: () => ({ eq: eqUpdate }),
    }),
    auth: { admin: { createUser } },
  },
}))

const { resolveTelegramUser } = await import("@/lib/telegram/resolve-user")

beforeEach(() => {
  maybeSingle.mockReset()
  createUser.mockReset()
  eqUpdate.mockClear()
})

describe("resolveTelegramUser", () => {
  it("returns the existing profile id when linked by telegram_user_id", async () => {
    maybeSingle.mockResolvedValueOnce({
      data: { id: "uuid-1", tier: "pro", applicant_data: null, language: "en" },
      error: null,
    })
    const r = await resolveTelegramUser({ id: 7 })
    expect(r.userId).toBe("uuid-1")
    expect(r.tier).toBe("pro")
    expect(createUser).not.toHaveBeenCalled()
  })

  it("provisions a new auth user when none is linked", async () => {
    maybeSingle
      .mockResolvedValueOnce({ data: null, error: null }) // by telegram_user_id
      .mockResolvedValueOnce({ data: null, error: null }) // by telegram_chat_id
    createUser.mockResolvedValueOnce({ data: { user: { id: "uuid-new" } }, error: null })
    const r = await resolveTelegramUser({ id: 8, username: "z" })
    expect(createUser).toHaveBeenCalledOnce()
    expect(r.userId).toBe("uuid-new")
    expect(r.tier).toBe("free")
  })

  it("throws (fails closed) when the lookup errors instead of provisioning", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: "db down" } })
    await expect(resolveTelegramUser({ id: 9 })).rejects.toThrow(/tg_lookup_failed/)
    expect(createUser).not.toHaveBeenCalled()
  })
})
