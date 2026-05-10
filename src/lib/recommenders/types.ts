/**
 * Recommender invite domain types. Lives outside actions.ts because
 * Next.js bans non-async exports from "use server" files.
 */

export type RecommenderInvite = {
  id: string
  user_id: string
  recommender_name: string
  recommender_email: string
  recommender_role: string | null
  token: string
  message: string | null
  status: "pending" | "opened" | "submitted" | "expired"
  expires_at: string
  opened_at: string | null
  submitted_at: string | null
  created_at: string
}
