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
// Sonnet bumped 4.5 -> 4.6 (adaptive thinking + 1M context, same price tier).
export const MODEL_IDS = {
  sonnet: "claude-sonnet-4-6",
  haiku: "claude-haiku-4-5",
} as const

export const models = {
  get claudeSonnet() { return anthropicClient()(MODEL_IDS.sonnet) },
  get claudeHaiku() { return anthropicClient()(MODEL_IDS.haiku) },
  get gpt4o() { return openaiClient()("gpt-4o") },
  get gpt4oMini() { return openaiClient()("gpt-4o-mini") },
}

export type ModelKey = keyof typeof models
