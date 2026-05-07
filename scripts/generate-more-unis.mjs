import Anthropic from "@anthropic-ai/sdk"
import { writeFileSync, readFileSync } from "node:fs"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = "claude-sonnet-4-5-20250929"
const PARALLEL = 4

const REGIONS = [
  "USA — additional state universities and liberal arts colleges (40 not in QS top 200): University of Georgia, Iowa State, Kansas, Mississippi State, Auburn, Tennessee, Kentucky, etc., plus regional flagships",
  "UK + Ireland — additional universities (35): Aberystwyth, Bangor, Stirling, Aberdeen, Plymouth, Portsmouth, Salford, Surrey, Lincoln, Coventry, Bradford, Brunel, Keele, etc., plus all Irish unis (Cork, Galway, Limerick, Maynooth, DCU, etc.)",
  "Germany — comprehensive list (40): every Technical University, every major Universität (Konstanz, Bayreuth, Bielefeld, Augsburg, Greifswald, Saarland, Bremen, Halle-Wittenberg, Marburg, Giessen, Düsseldorf, Münster, Paderborn, Magdeburg, etc.)",
  "France — comprehensive (35): all major universités (Aix-Marseille, Bordeaux, Lille, Lyon 1/2/3, Montpellier, Nantes, Toulouse, Strasbourg, Grenoble, Rennes), grandes écoles (Mines ParisTech, ESSEC, EDHEC, EM Lyon, HEC Paris, ESCP, ENS Lyon, Centrale Paris), Sciences Po",
  "Italy + Spain + Portugal (40): Italian (Pisa, Florence, Padua, Bologna, Turin, Naples Federico II, Trieste, Rome La Sapienza/Tor Vergata, Catholic, etc.), Spanish (Autonoma Barcelona/Madrid, Complutense, Salamanca, Granada, Valencia, Sevilla, Zaragoza, Pompeu Fabra, ESADE, IESE), Portuguese (Lisbon, Porto, Coimbra)",
  "Nordic countries (30): Sweden (Uppsala, Gothenburg, Linköping, Umeå, Chalmers), Denmark (Copenhagen, Aarhus, DTU, SDU, Aalborg), Norway (Oslo, NTNU, Bergen, Tromsø, BI Norwegian), Finland (Helsinki, Aalto, Tampere, Turku, Jyväskylä, Oulu), Iceland",
  "Netherlands + Belgium + Austria + Switzerland (35): all Dutch unis (Erasmus, Utrecht, Groningen, Leiden, Maastricht, TU Delft, TU Eindhoven, Wageningen, Amsterdam VU, Tilburg, Twente, Radboud), Belgian (KU Leuven, Ghent, ULB, UCLouvain, Antwerpen), Austrian (Vienna, TU Wien, Graz, Innsbruck, Salzburg), Swiss (Zurich, Geneva, Lausanne UNIL, Bern, Basel, USI)",
  "China + Taiwan + Hong Kong (45): comprehensive Chinese universities (Tsinghua, Peking, Fudan, SJTU, Zhejiang, Nanjing, USTC, Wuhan, Sichuan, Sun Yat-sen, Xi'an Jiaotong, Tongji, Renmin, Nankai, etc.), Hong Kong (HKU, HKUST, CUHK, PolyU, CityU, Baptist, Lingnan, EdUHK), Taiwanese (NTU, NCTU, NCKU, NTHU, NCCU, NSYSU)",
  "Japan + Korea (40): Japan (Tokyo, Kyoto, Osaka, Tohoku, Hokkaido, Nagoya, Kyushu, Tsukuba, Tokyo Tech, Hitotsubashi, Keio, Waseda, Sophia, ICU, etc.), Korea (Seoul National, KAIST, POSTECH, Yonsei, Korea, Sungkyunkwan, Hanyang, Kyung Hee, Ewha, Yonsei, etc.)",
  "Australia + NZ (25): all Group of Eight (Melbourne, Sydney, ANU, Queensland, Monash, UNSW, Adelaide, UWA), plus Macquarie, RMIT, UTS, Wollongong, Curtin, Newcastle, Tasmania, Griffith, La Trobe, Western Sydney; NZ (Auckland, Otago, Canterbury, Victoria Wellington, Massey, Waikato, AUT)",
  "Singapore + Malaysia + Thailand + Indonesia + Philippines + Vietnam (35): SG (NUS, NTU, SMU, SUTD), Malaysia (UM, UKM, USM, UPM, UTM, Monash Malaysia, Sunway, Taylor's), Thailand (Chulalongkorn, Mahidol, Thammasat, Kasetsart, Prince of Songkla, KMUTT), Indonesia (UI, ITB, UGM, Airlangga, Brawijaya), Philippines (UP, Ateneo, La Salle), Vietnam (VNU Hanoi/HCMC, HUST, FPT)",
  "India — comprehensive (45): IITs (Bombay, Delhi, Madras, Kanpur, Kharagpur, Roorkee, Guwahati, Hyderabad, Indore, BHU), IIMs (Ahmedabad, Bangalore, Calcutta, Lucknow, Indore, Kozhikode), IISc, BITS Pilani, Manipal, JNU, Delhi University, Jadavpur, Anna University, Osmania, Mumbai, Pune, Hyderabad Central, IIIT Hyderabad, etc.",
  "Latin America (40): Mexico (UNAM, ITESM/Tec Monterrey, IPN, UDLAP, ITAM), Brazil (USP, UNICAMP, UFRJ, UFMG, UnB, UFRGS, UFSC, UFPE), Argentina (UBA, UTN, UCA, San Andrés, Torcuato Di Tella), Chile (UChile, PUC, USACH, UTFSM, Andrés Bello), Colombia (Andes, Nacional, Javeriana, Externado), Peru (PUCP, UPC, UPCH), others",
  "Middle East + North Africa (30): Israel (Hebrew, Tel Aviv, Technion, BGU, Bar-Ilan, Reichman, Weizmann), Saudi Arabia (KAUST, KFUPM, KAU, KSU), UAE (KU, UAEU, AUS, NYU Abu Dhabi), Qatar (QU, HBKU), Turkey (Bogazici, METU, Bilkent, Koc, Sabanci, Istanbul Tech, Ankara), Egypt (AUC, Cairo), Morocco, Jordan, Iran",
  "Sub-Saharan Africa (25): South Africa (Cape Town, Witwatersrand, Stellenbosch, Pretoria, KwaZulu-Natal, Rhodes, Free State, North-West), Nigeria (Lagos, Ibadan, Covenant, OAU, ABU), Ghana (Legon, Kwame Nkrumah), Kenya (Nairobi, JKUAT, Strathmore), Egypt overlap, Ethiopia (Addis Ababa), Senegal, Tanzania, Uganda (Makerere)",
  "Eastern Europe + Russia + CIS (40): Russia (MSU, SPbU, MIPT, HSE, ITMO, Bauman, MEPhI, Tomsk, Novosibirsk, MGIMO), Poland (Jagiellonian, Warsaw, AGH, Lodz, Wroclaw, Adam Mickiewicz), Czech (Charles, CTU, Masaryk, VUT Brno), Hungary (ELTE, BME, Semmelweis, Corvinus, Debrecen, Szeged), Romania (Babes-Bolyai, Bucharest, Politehnica), Ukraine (Kyiv, Karazin, KPI), Estonia (Tartu, TalTech), Lithuania (Vilnius), Kazakhstan (KazNU, NU)",
  "Canada — additional (20): Carleton, Saskatchewan, Manitoba, Memorial, New Brunswick, Concordia, UQAM, Laval, Sherbrooke, York, Ryerson/TMU, Lakehead, Brock, Windsor, UBC Okanagan, SFU, Victoria, Guelph, Dalhousie, Trent",
]

const existing = JSON.parse(readFileSync("C:/Users/Huawei/Documents/entrium-ai-v2/scripts/seed/universities.json", "utf8"))
const existingNames = new Set(existing.map((u) => `${u.name.toLowerCase()}|${u.country.toLowerCase()}`))
console.log(`Existing: ${existing.length} universities`)
const existingList = existing.slice(0, 100).map((u) => u.name).join(", ") // pass first 100 names as exclusion sample

async function ask(prompt, attempt = 1) {
  try {
    const msg = await client.messages.create({
      model: MODEL, max_tokens: 16000,
      messages: [{ role: "user", content: prompt }],
    })
    const text = msg.content[0].type === "text" ? msg.content[0].text : ""
    const m = text.match(/\[[\s\S]*\]/)
    if (!m) throw new Error("No JSON")
    return JSON.parse(m[0])
  } catch (e) {
    if (attempt < 3) { await new Promise((r) => setTimeout(r, 2000 * attempt)); return ask(prompt, attempt + 1) }
    throw e
  }
}

async function genRegion(region, idx) {
  const items = await ask(`Generate a JSON array of universities matching: ${region}.

For each:
{
  "qs_rank": <integer QS 2025 rank or null if unranked>,
  "name": "<official English name>",
  "country": "<country>",
  "city": "<city>",
  "website": "<official URL>",
  "description": "<2-3 sentences>"
}

DO NOT include these (already in our database): ${existingList}
Output ONLY a valid JSON array. Real, accurate data only.`)
  console.log(`  ✓ R${idx + 1}: ${items.length} unis`)
  return items
}

async function runParallel(tasks) {
  const out = []
  for (let i = 0; i < tasks.length; i += PARALLEL) {
    const slice = tasks.slice(i, i + PARALLEL)
    const r = await Promise.all(slice.map((fn) => fn().catch((e) => { console.log(`  ✗ ${e.message.slice(0,80)}`); return [] })))
    out.push(...r)
  }
  return out.flat()
}

console.log(`\n═══ Generating regional supplements ═══`)
const newRaw = await runParallel(REGIONS.map((r, i) => () => genRegion(r, i)))

// Merge with existing, dedupe by name+country
const merged = [...existing]
let added = 0
for (const u of newRaw) {
  if (!u.name || !u.country) continue
  const key = `${u.name.toLowerCase()}|${u.country.toLowerCase()}`
  if (existingNames.has(key)) continue
  existingNames.add(key)
  merged.push(u)
  added++
}

writeFileSync("C:/Users/Huawei/Documents/entrium-ai-v2/scripts/seed/universities.json", JSON.stringify(merged, null, 2))
console.log(`\n✅ Total: ${merged.length} universities (added ${added} new from ${newRaw.length} generated)`)
