import ExcelJS from "exceljs"
import { requireAdminApi } from "@/lib/admin/auth"
import { supabaseAdmin } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// PDF spec §11: users sheet with user_id, name, city, university, ... .
// Source of truth stays in Postgres; .xlsx is read-only export for analytics.
export async function GET() {
  const denied = await requireAdminApi()
  if (denied) return denied

  const { data: users, error } = await supabaseAdmin
    .from("users_with_payments")
    .select("*")
    .order("registration_date", { ascending: false })
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

  const ws = wb.addWorksheet("Users", {
    views: [{ state: "frozen", ySplit: 1 }],
  })

  ws.columns = [
    { header: "user_id", key: "user_id", width: 38 },
    { header: "email", key: "email", width: 32 },
    { header: "first_name", key: "first_name", width: 16 },
    { header: "last_name", key: "last_name", width: 16 },
    { header: "phone", key: "phone", width: 18 },
    { header: "age", key: "age", width: 6 },
    { header: "gender", key: "gender", width: 10 },
    { header: "country", key: "country", width: 14 },
    { header: "city", key: "city", width: 16 },
    { header: "school_or_university", key: "school_or_university", width: 30 },
    { header: "class_or_course", key: "class_or_course", width: 16 },
    { header: "auth_provider", key: "auth_provider", width: 14 },
    { header: "tier", key: "tier", width: 8 },
    { header: "role", key: "role", width: 8 },
    { header: "google_id", key: "google_id", width: 24 },
    { header: "telegram_id", key: "telegram_id", width: 16 },
    { header: "yandex_id", key: "yandex_id", width: 24 },
    { header: "whatsapp_phone", key: "whatsapp_phone", width: 18 },
    { header: "whatsapp_verified", key: "whatsapp_verified", width: 12 },
    { header: "total_paid_usd", key: "total_paid", width: 14 },
    { header: "payment_count", key: "payment_count", width: 12 },
    { header: "last_payment_at", key: "last_payment_at", width: 22 },
    { header: "registration_date", key: "registration_date", width: 22 },
    { header: "updated_at", key: "updated_at", width: 22 },
  ]

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).alignment = { vertical: "middle" }

  for (const u of users ?? []) {
    ws.addRow(u)
  }

  const buf = await wb.xlsx.writeBuffer()
  const today = new Date().toISOString().slice(0, 10)

  return new Response(buf, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="entrium-users-${today}.xlsx"`,
      "cache-control": "no-store",
    },
  })
}
