import crypto from "node:crypto"

export type TelegramUser = {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

export type InitDataResult =
  | { ok: true; user: TelegramUser; authDate: number }
  | { ok: false; reason: "missing" | "bad_hash" | "expired" | "no_user" }

const DEFAULT_MAX_AGE = 24 * 60 * 60

export function validateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number = DEFAULT_MAX_AGE,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): InitDataResult {
  if (!initData || !botToken) return { ok: false, reason: "missing" }

  const params = new URLSearchParams(initData)
  const hash = params.get("hash")
  if (!hash) return { ok: false, reason: "missing" }
  params.delete("hash")

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n")

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest()
  const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex")

  if (
    computed.length !== hash.length ||
    !crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash))
  ) {
    return { ok: false, reason: "bad_hash" }
  }

  const authDate = Number(params.get("auth_date") ?? 0)
  if (!authDate || nowSeconds - authDate > maxAgeSeconds) return { ok: false, reason: "expired" }

  const userRaw = params.get("user")
  if (!userRaw) return { ok: false, reason: "no_user" }
  let user: TelegramUser
  try {
    user = JSON.parse(userRaw) as TelegramUser
  } catch {
    return { ok: false, reason: "no_user" }
  }
  if (!user?.id) return { ok: false, reason: "no_user" }

  return { ok: true, user, authDate }
}
