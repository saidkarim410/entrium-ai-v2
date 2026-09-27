// src/lib/office.ts — best-effort телеметрия в 3D-офис агентов (/agents-office/ проекта лендинга).
// Fire-and-forget: НИКОГДА не бросает и не блокирует запрос. Выключено, пока не заданы обе env:
//   OFFICE_INGEST_URL      напр. https://entriumuz-main.vercel.app/api/ingest
//   OFFICE_INGEST_SECRET   общий секрет (совпадает с INGEST_SECRET на стороне лендинга)
// Персональные данные НЕ отправляем — только slug инструмента и короткое действие.
type OfficeStatus = "idle" | "think" | "work" | "send" | "done"

export function emitOfficeEvent(
  agent: string,
  action = "ответил студенту",
  status: OfficeStatus = "done",
): void {
  const url = process.env.OFFICE_INGEST_URL
  const secret = process.env.OFFICE_INGEST_SECRET
  if (!url || !secret) return
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 2500)
    void fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ingest-secret": secret },
      body: JSON.stringify({ agent, action, status, src: "v2" }),
      signal: ctrl.signal,
      keepalive: true,
    })
      .catch(() => undefined)
      .finally(() => clearTimeout(timer))
  } catch {
    // никогда не мешаем основному запросу
  }
}
