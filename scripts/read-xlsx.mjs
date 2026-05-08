import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"

// Use exceljs if available, else fall back to unzip + xml parsing
let ExcelJS
try {
  ExcelJS = (await import("exceljs")).default
} catch {
  console.log("exceljs not installed, install with: npm i exceljs")
  process.exit(1)
}

for (const path of process.argv.slice(2)) {
  console.log(`\n═══════════════════════════════════════════`)
  console.log(`  ${path}`)
  console.log(`═══════════════════════════════════════════`)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(path)
  for (const sheet of wb.worksheets) {
    console.log(`\n── Sheet: "${sheet.name}" (${sheet.rowCount} rows × ${sheet.columnCount} cols) ──`)
    sheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
      const vals = row.values.slice(1).map((v) => {
        if (v == null) return ""
        if (typeof v === "object" && v.text) return v.text
        if (typeof v === "object" && v.richText) return v.richText.map((r) => r.text).join("")
        return String(v)
      })
      const line = vals.filter(Boolean).join(" | ").slice(0, 250)
      if (line) console.log(`  R${rowNum}: ${line}`)
    })
  }
}
