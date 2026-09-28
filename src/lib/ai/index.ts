import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"

let _anthropicClient: ReturnType<typeof createAnthropic> | null = null
let _openaiClient: ReturnType<typeof createOpenAI> | null = null

function anthropicClient() {
  if (!_anthropicClient) {
    _anthropicClient = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropicClient
}

function openaiClient() {
  if (!_openaiClient) {
    _openaiClient = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openaiClient
}

// Model IDs centralised so the actual model and the logged `modelId` can never drift.
// Overridable from the environment so the owner can switch tiers without a deploy
// (e.g. AI_MODEL_PRO=claude-sonnet-5 — cheaper than 4.6 at $2/$10 vs $3/$15 per 1M):
//   AI_MODEL_PRO  — Pro tier (default claude-sonnet-4-6)
//   AI_MODEL_FREE — Free tier (default claude-haiku-4-5)
//   AI_MODEL_BACKGROUND — crons, digests, document parsing and other non-interactive
//                         work (default claude-haiku-4-5: the cheapest capable tier)
export const MODEL_IDS = {
  sonnet: process.env.AI_MODEL_PRO?.trim() || "claude-sonnet-4-6",
  haiku: process.env.AI_MODEL_FREE?.trim() || "claude-haiku-4-5",
  background: process.env.AI_MODEL_BACKGROUND?.trim() || "claude-haiku-4-5",
} as const

export const models = {
  get claudeSonnet() { return anthropicClient()(MODEL_IDS.sonnet) },
  get claudeHaiku() { return anthropicClient()(MODEL_IDS.haiku) },
  /** Cheapest tier for background jobs — never the user's Pro model */
  get claudeBackground() { return anthropicClient()(MODEL_IDS.background) },
  get gpt4o() { return openaiClient()("gpt-4o") },
  get gpt4oMini() { return openaiClient()("gpt-4o-mini") },
}

export type ModelKey = keyof typeof models
