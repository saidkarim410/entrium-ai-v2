const VERCEL_TOKEN = process.env.VERCEL_TOKEN
const PROJECT_ID = "prj_JiUijuqXlVnuG6OVjLBXf5o7pUtq"
const TEAM_ID = "team_MPhSFfSFW1AFxP4nHcdpGxpZ"

// Read all env values from process.env (avoid committing secrets)
const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "NEXT_PUBLIC_SITE_URL",
]
const envs = Object.fromEntries(REQUIRED.map((k) => [k, process.env[k]]))
for (const [k, v] of Object.entries(envs)) {
  if (!v) {
    console.error(`Missing env: ${k}`)
    process.exit(1)
  }
}

const baseHeaders = {
  Authorization: `Bearer ${VERCEL_TOKEN}`,
  "Content-Type": "application/json",
}

// 1. List existing env vars
const listRes = await fetch(
  `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
  { headers: baseHeaders }
)
const list = await listRes.json()
console.log(`Found ${list.envs.length} existing env vars`)

// 2. Delete all keys we're going to recreate
for (const key of Object.keys(envs)) {
  const existing = list.envs.find((e) => e.key === key)
  if (existing) {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${existing.id}?teamId=${TEAM_ID}`,
      { method: "DELETE", headers: baseHeaders }
    )
    console.log(`DELETE ${key}: ${res.status}`)
  }
}

// 3. Create them fresh, sending JSON (no BOM possible)
for (const [key, value] of Object.entries(envs)) {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
    {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify({
        key,
        value,
        type: "encrypted",
        target: ["production", "preview", "development"],
      }),
    }
  )
  const text = await res.text()
  console.log(`CREATE ${key}: ${res.status} ${res.ok ? "OK" : text.slice(0, 200)}`)
}
