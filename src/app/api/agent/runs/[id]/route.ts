import { z } from "zod"
import { getCurrentUser } from "@/lib/supabase/server"
import { getMissionRun } from "@/lib/agent/runs"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Restore a mission run after a page refresh (P0-01). Returns the persisted
 * step records including the canonical text of completed steps; failed steps
 * carry a machine `reason` so the UI can offer "retry this step".
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  if (!z.string().uuid().safeParse(id).success) {
    return Response.json({ error: "invalid_id" }, { status: 400 })
  }

  const run = await getMissionRun(id, user.id)
  if (!run) return Response.json({ error: "not_found" }, { status: 404 })

  return Response.json({ run }, { headers: { "Cache-Control": "no-store" } })
}
