import Anthropic from "@anthropic-ai/sdk"
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = "claude-sonnet-4-5-20250929"
const PARALLEL = 3 // concurrent batches

const UNIS_BATCHES = []
for (let start = 1; start <= 1500; start += 40) {
  const end = Math.min(start + 39, 1500)
  UNIS_BATCHES.push({ start, end })
}

const SCH_CATEGORIES = [
  "30 major UK scholarships (Chevening, Rhodes, Marshall, Commonwealth, Cambridge Trust, Oxford-specific, Edinburgh, GREAT, etc.)",
  "30 major US scholarships (Fulbright, Knight-Hennessy, Schwarzman, Yale World Fellows, Harvard fellowships, Hubert Humphrey, AAUW, ASF, etc.)",
  "30 major German + Austrian + Swiss scholarships (DAAD, Heinrich Böll, KAS, Friedrich Ebert, Friedrich Naumann, ÖAD, ETH Doctoral, EPFL, IST Austria, etc.)",
  "30 major French + Italian + Spanish scholarships (Eiffel, France Excellence, Erasmus Mundus, Italian Government, Politecnico Milano, Sapienza, MAEC-AECID, etc.)",
  "30 major Nordic + Benelux scholarships (Sweden Government, Lund, KTH, Holland Scholarship, Orange Tulip, Copenhagen, Aarhus, Norway Quota, etc.)",
  "30 major Japan + Korea + China scholarships (MEXT, JASSO, ADB-Japan, Korean Government KGSP, Hyundai, POSCO, Chinese Government CSC, Confucius, Schwarzman, etc.)",
  "30 major Australia + NZ + Singapore + HK + EU scholarships (Australian Awards, Endeavour, Adelaide, Sydney, NZ ASEAN, NZ Commonwealth, NUS, NTU, Singapore SINGA, HKPFS, Erasmus Mundus, Marie Curie, etc.)",
  "30 major Middle East + Africa + Latin America scholarships (KAUST, Khalifa, MBZUAI, Mandela Rhodes, MasterCard Foundation, OEA-GCUB, Brazilian Government, Mexico, Chile CONACyT, AfDB, etc.)",
  "30 major foundation + private scholarships (Aga Khan, Boustany, Gates Cambridge, OSI, Open Society, Soros, Civil Society Leadership, Joint Japan World Bank, IsDB, IDB, UNESCO, Wallenberg, etc.)",
  "30 STEM, business and field-specific scholarships (Google, Microsoft, IBM, Adobe, Bosch, Siemens, McKinsey Excellence, BCG Bridge, Deloitte, IEEE, ACM, IBRO Neuroscience, Schmidt Futures, etc.)",
]

async function ask(prompt, attempt = 1) {
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    })
    const text = msg.content[0].type === "text" ? msg.content[0].text : ""
    const m = text.match(/\[[\s\S]*\]/)
    if (!m) throw new Error("No JSON array in response")
    return JSON.parse(m[0])
  } catch (e) {
    if (attempt < 3) {
      console.log(`  retry ${attempt + 1}: ${e.message.slice(0, 80)}`)
      await new Promise((r) => setTimeout(r, 2000 * attempt))
      return ask(prompt, attempt + 1)
    }
    throw e
  }
}

async function genUnis(start, end) {
  const items = await ask(`Generate a JSON array of universities ranked QS World Rankings 2025 positions ${start}-${end} (${end - start + 1} universities total).

For each university:
{
  "qs_rank": <integer in [${start}, ${end}]>,
  "name": "<official English name>",
  "country": "<country>",
  "city": "<city>",
  "website": "<official URL>",
  "description": "<2-3 sentences: notable strengths, famous programs, location vibe>"
}

Output ONLY a valid JSON array of EXACTLY ${end - start + 1} universities. Use REAL QS 2025 data — accurate ranks, real cities, real URLs. Cover diverse countries appropriate for this rank range. NO duplicates. NO fake universities.`)
  console.log(`  ✓ ${start}-${end}: ${items.length} unis`)
  return items
}

async function genScholarships(category, idx) {
  const items = await ask(`Generate a JSON array of ${category}.

For each scholarship:
{
  "name": "<exact scholarship name>",
  "provider": "<organization/government/university>",
  "country": "<host country>",
  "level": "<bachelor|master|phd|any>",
  "amount_usd": <approximate USD value of full benefit per year, integer, or 0>,
  "full_funding": <boolean>,
  "deadline": "<typical month or 'Rolling'>",
  "url": "<official URL>",
  "description": "<2-3 sentences: target audience, what's covered, key requirements>",
  "requirements": ["<key requirement 1>", "<key requirement 2>", ...]
}

Output ONLY a valid JSON array of REAL, accurate scholarship programs. NO fake or made-up programs.`)
  console.log(`  ✓ Category ${idx + 1}: ${items.length} scholarships`)
  return items
}

async function runParallel(tasks, parallel = PARALLEL) {
  const results = []
  for (let i = 0; i < tasks.length; i += parallel) {
    const slice = tasks.slice(i, i + parallel)
    const batch = await Promise.all(slice.map((fn) => fn().catch((e) => {
      console.error(`  ✗ ${e.message.slice(0, 100)}`)
      return []
    })))
    results.push(...batch)
  }
  return results.flat()
}

const outDir = "C:/Users/Huawei/Documents/entrium-ai-v2/scripts/seed"
mkdirSync(outDir, { recursive: true })

console.log(`\n═══ Universities (${UNIS_BATCHES.length} batches × ~40 = ~${UNIS_BATCHES.length * 40}) ═══`)
const unisRaw = await runParallel(UNIS_BATCHES.map((b) => () => genUnis(b.start, b.end)))

// Dedupe by name+country
const seen = new Set()
const unis = unisRaw.filter((u) => {
  const key = `${u.name?.toLowerCase()}|${u.country?.toLowerCase()}`
  if (seen.has(key)) return false
  seen.add(key)
  return true
})

writeFileSync(`${outDir}/universities.json`, JSON.stringify(unis, null, 2))
console.log(`✅ Saved ${unis.length} unique universities (deduped from ${unisRaw.length})`)

console.log(`\n═══ Scholarships (${SCH_CATEGORIES.length} categories × ~30 = ~${SCH_CATEGORIES.length * 30}) ═══`)
const schRaw = await runParallel(SCH_CATEGORIES.map((c, i) => () => genScholarships(c, i)))

const schSeen = new Set()
const sch = schRaw.filter((s) => {
  const key = `${s.name?.toLowerCase()}|${s.country?.toLowerCase()}`
  if (schSeen.has(key)) return false
  schSeen.add(key)
  return true
})

writeFileSync(`${outDir}/scholarships.json`, JSON.stringify(sch, null, 2))
console.log(`✅ Saved ${sch.length} unique scholarships (deduped from ${schRaw.length})`)
