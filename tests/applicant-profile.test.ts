/**
 * Tests for getApplicantProfile defensive merge (Q-7 from
 * TZ_FULLSTACK.md). Born from a real production crash:
 *
 *   /onboarding fell over with "Cannot read properties of undefined
 *   (reading 'name')" because `applicant_data` could be:
 *     - null (brand new user)
 *     - {} (server action wrote a partial object)
 *     - { personal: {...} } (academic & goals missing)
 *
 *   The wizard read `profile.personal.name` immediately on mount
 *   without optional chaining, so undefined nested keys = crash.
 *
 * The fix in `getApplicantProfile()` spreads `EMPTY_PROFILE` under
 * the stored object so personal/academic/goals always exist.
 *
 * These tests pin that contract by mocking the Supabase client at
 * import-time via vi.mock — no real DB needed.
 */
import { describe, it, expect, beforeEach, vi } from "vitest"
import { EMPTY_PROFILE } from "@/lib/applicant/types"

// Mock supabaseAdmin and getCurrentUser before importing the module
// under test. vi.mock hoists, so order of declarations matters.
const maybeSingleMock = vi.fn()
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
  },
}))

vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser: vi.fn(async () => ({ id: "test-user-id", email: "test@local" })),
}))

// Other deps the module pulls in transitively
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/referrals/actions", () => ({ awardReferralOnCompletion: vi.fn() }))
vi.mock("@/lib/profile-snapshots/actions", () => ({ captureSnapshot: vi.fn() }))

const { getApplicantProfile } = await import("@/lib/applicant/actions")

beforeEach(() => {
  maybeSingleMock.mockReset()
})

describe("getApplicantProfile — defensive merge", () => {
  it("returns EMPTY_PROFILE when user has no profile row", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: null })
    const profile = await getApplicantProfile()
    expect(profile).toEqual(EMPTY_PROFILE)
  })

  it("returns EMPTY_PROFILE when applicant_data column is null", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: { applicant_data: null } })
    const profile = await getApplicantProfile()
    expect(profile.personal).toBeDefined()
    expect(profile.academic).toBeDefined()
    expect(profile.goals).toBeDefined()
  })

  it("guarantees personal/academic/goals exist when applicant_data is empty {}", async () => {
    maybeSingleMock.mockResolvedValueOnce({ data: { applicant_data: {} } })
    const profile = await getApplicantProfile()
    expect(profile.personal).toEqual({})
    expect(profile.academic).toEqual({})
    expect(profile.goals).toEqual({})
  })

  it("preserves stored personal data and fills missing academic/goals", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        applicant_data: { personal: { name: "Alice", age: "17" } },
      },
    })
    const profile = await getApplicantProfile()
    expect(profile.personal.name).toBe("Alice")
    expect(profile.personal.age).toBe("17")
    expect(profile.academic).toEqual({})
    expect(profile.goals).toEqual({})
  })

  it("merges all three sections without losing any keys", async () => {
    maybeSingleMock.mockResolvedValueOnce({
      data: {
        applicant_data: {
          personal: { name: "Bob" },
          academic: { gpa: "3.9" },
          goals: { major: "CS" },
          activities: "Robotics club",
        },
      },
    })
    const profile = await getApplicantProfile()
    expect(profile.personal.name).toBe("Bob")
    expect(profile.academic.gpa).toBe("3.9")
    expect(profile.goals.major).toBe("CS")
    expect(profile.activities).toBe("Robotics club")
  })

  it("does NOT crash when reading nested keys on a freshly-merged profile", async () => {
    // The original bug: profile.personal.name throws if personal is undefined.
    maybeSingleMock.mockResolvedValueOnce({ data: { applicant_data: {} } })
    const profile = await getApplicantProfile()
    // Mimic what onboarding-wizard does on render
    expect(() => {
      const _name = profile.personal.name ?? ""
      const _age = profile.personal.age ?? ""
      const _gpa = profile.academic.gpa ?? ""
      const _level = profile.goals.level ?? "Bachelor"
      void _name; void _age; void _gpa; void _level
    }).not.toThrow()
  })
})
