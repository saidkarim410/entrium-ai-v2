import { readFileSync, writeFileSync } from "node:fs"

const raw = readFileSync("C:/Users/Huawei/Documents/drpulatov.uz-main/qs_full_data.json", "utf8")
// Outer is double-stringified — parse twice
const arr = JSON.parse(JSON.parse(raw))

console.log(`Loaded ${arr.length} universities from QS API`)

const transformed = arr.map((u) => {
  // Some ranks are ranges like "1001-1200", strip and use lower bound; some are "joint" like "=15"
  let qsRank = null
  const rankStr = u.rank_display?.toString() ?? u.rank?.toString() ?? ""
  const cleaned = rankStr.replace(/[=+~]/g, "")
  if (cleaned.includes("-")) {
    qsRank = parseInt(cleaned.split("-")[0], 10)
  } else {
    qsRank = parseInt(cleaned, 10)
  }
  if (isNaN(qsRank)) qsRank = null

  return {
    qs_rank: qsRank,
    rank_display: u.rank_display ?? null,
    name: u.name,
    country: u.country,
    city: u.city || null,
    region: u.region || null,
    website: u.path ? `https://www.topuniversities.com${u.path}` : null,
    overall_score: u.overall_score ? parseFloat(u.overall_score) : null,
    description: u.region ? `${u.name} is located in ${u.city ? u.city + ", " : ""}${u.country} (${u.region}). QS World Rankings 2026 position: ${u.rank_display ?? "unranked"}.${u.overall_score ? ` Overall score: ${u.overall_score}/100.` : ""}` : null,
  }
})

writeFileSync(
  "C:/Users/Huawei/Documents/entrium-ai-v2/scripts/seed/universities.json",
  JSON.stringify(transformed, null, 2)
)

const ranks = transformed.filter((u) => u.qs_rank !== null).length
const countries = new Set(transformed.map((u) => u.country)).size

console.log(`✅ Transformed ${transformed.length} universities`)
console.log(`   ${ranks} with QS rank, ${countries} unique countries`)
console.log(`   Sample: ${JSON.stringify(transformed[0], null, 2)}`)
console.log(`   Sample (last): ${JSON.stringify(transformed[transformed.length - 1], null, 2)}`)
