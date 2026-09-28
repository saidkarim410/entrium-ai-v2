/**
 * Model prices in USD per 1M tokens (Anthropic first-party API rates, checked
 * 2026-09-28 against the Claude API reference). Used to fill `usage_events.cost_usd`
 * so the admin can see the real cost per tool, per user and per day (CTO TZ §5:
 * «фиксировать себестоимость», «оценка себестоимости активного пользователя»).
 * Unknown models cost 0 and are reported as "unpriced" rather than guessed.
 */
export type ModelPrice = { input: number; output: number }

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-sonnet-5": { input: 2.0, output: 10.0 },
  "claude-opus-4-6": { input: 5.0, output: 25.0 },
  "claude-opus-5": { input: 5.0, output: 25.0 },
  // OpenAI (used for embeddings / legacy GPT calls / realtime token issuing)
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
}

/** Strip date suffixes / provider prefixes so "claude-haiku-4-5-20251001" still prices. */
export function normalizeModelId(model: string): string {
  const m = model.trim().toLowerCase().replace(/^(anthropic|openai)[./]/, "")
  const base = m.replace(/-\d{8}$/, "")
  if (MODEL_PRICES[base]) return base
  // "claude-3-5-haiku-..." style or partial matches: pick the longest known key contained in the id
  const hit = Object.keys(MODEL_PRICES)
    .filter((k) => m.includes(k))
    .sort((a, b) => b.length - a.length)[0]
  return hit ?? base
}

export function isPricedModel(model: string): boolean {
  return Boolean(MODEL_PRICES[normalizeModelId(model)])
}

/** USD for one call; 0 when the model is unknown (see isPricedModel). */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = MODEL_PRICES[normalizeModelId(model)]
  if (!price) return 0
  const usd = (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output
  return Math.round(usd * 1_000_000) / 1_000_000
}

/** Rough UZS view for the owner (rate is a config knob, not market data). */
export const USD_TO_UZS = Number(process.env.USD_TO_UZS ?? 12_800)

export function formatUsd(usd: number): string {
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
}
