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

export const models = {
  get claudeSonnet() { return anthropicClient()("claude-sonnet-4-5-20250929") },
  get claudeHaiku() { return anthropicClient()("claude-haiku-4-5-20251001") },
  get gpt4o() { return openaiClient()("gpt-4o") },
  get gpt4oMini() { return openaiClient()("gpt-4o-mini") },
}

export type ModelKey = keyof typeof models
