import ExcelJS from "exceljs"
import { requireAdminApi } from "@/lib/admin/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// PDF spec §11: payments sheet with payment_id, user_id, amount, method, date.
// We never store the user's name in PAYMENTS — only user_id as FK.
export async function GET() {
  const denied = await requireAdminApi()
  if (denied) return denied

  const { data: payments, error } = await supabaseAdmin
    .from("payments")
    .select(
      "id, user_id, amount, currency, payment_method, payment_platform, payment_status, stripe_payment_intent_id, description, payment_date, created_at",
    )
    .order("payment_date", { ascending: false })
    .limit(50_000)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    })
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = "Entrium AI Admin"
  wb.created = new Date()

  const ws = wb.addWorksheet("Payments", {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  ws.columns = [
    { header: "payment_id", key: "id", width: 38 },
    { header: "user_id", key: "user_id", width: 38 },
    { header: "amount", key: "amount", width: 12, style: { numFmt: "#,##0.00" } },
    { header: "currency", key: "currency", width: 8 },
    { header: "payment_method", key: "payment_method", width: 16 },
    { header: "payment_platform", key: "payment_platform", width: 14 },
    { header: "payment_status", key: "payment_status", width: 12 },
    { header: "stripe_payment_intent_id", key: "stripe_payment_intent_id", width: 32 },
    { header: "description", key: "description", width: 30 },
    { header: "payment_date", key: "payment_date", width: 22 },
    { header: "created_at", key: "created_at", width: 22 },
  ]

  ws.getRow(1).font = { bold: true }

  for (const p of payments ?? []) {
    ws.addRow(p)
  }

  const buf = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().slice(0, 10)

  return new Response(buf, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="entrium-payments-${today}.xlsx"`,
      "cache-control": "no-store",
    },
  })
}
