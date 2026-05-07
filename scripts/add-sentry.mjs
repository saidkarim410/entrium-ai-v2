const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const PROJECT_ID = "prj_JiUijuqXlVnuG6OVjLBXf5o7pUtq"
const TEAM_ID = "team_MPhSFfSFW1AFxP4nHcdpGxpZ"

const newVars = {
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
}
if (!newVars.NEXT_PUBLIC_SENTRY_DSN) {
  console.error("Missing NEXT_PUBLIC_SENTRY_DSN env")
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${VERCEL_TOKEN}`,
  "Content-Type": "application/json",
}

const list = await (await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, { headers })).json()

for (const [key, value] of Object.entries(newVars)) {
  const existing = list.envs.find((e) => e.key === key)
  if (existing) {
    await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${existing.id}?teamId=${TEAM_ID}`, { method: "DELETE", headers })
  }
  const res = await fetch(`https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ key, value, type: "encrypted", target: ["production", "preview", "development"] }),
  })
  console.log(`${key}: ${res.status}`)
}
