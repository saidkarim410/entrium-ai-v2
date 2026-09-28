"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { addPlanTask } from "@/lib/plan/actions"
import { CalendarPlus, Check } from "lucide-react"

/**
 * "Add this deadline to my plan" (P1-03). The task is saved with the
 * OFFICIAL deadline kind so it is never confused with a personal prep date.
 */
export function AddDeadlineToPlan({
  title,
  dueDate,
  scholarshipId,
  applicationId,
  programId,
  kind = "official",
  source,
}: {
  title: string
  dueDate: string | null
  scholarshipId?: string
  applicationId?: string
  programId?: string
  kind?: "official" | "estimate"
  source: "scholarship" | "application" | "program"
}) {
  const [pending, start] = useTransition()
  const [added, setAdded] = useState(false)

  function add() {
    start(async () => {
      const res = await addPlanTask({
        title,
        due_date: dueDate ?? "",
        deadline_kind: dueDate ? kind : "estimate",
        priority: "high",
        category: "application",
        source,
        scholarship_id: scholarshipId,
        application_id: applicationId,
        program_id: programId,
      })
      if (!res.ok) {
        toast.error(res.error === "plan_table_missing" ? "Раздел «План» ещё не активирован (миграция 0026)" : res.error)
        return
      }
      setAdded(true)
      toast.success("Добавлено в план")
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={add} disabled={pending || added} className="gap-1.5">
      {added ? <Check className="h-3.5 w-3.5" /> : <CalendarPlus className="h-3.5 w-3.5" />}
      {added ? "В плане" : dueDate ? "Дедлайн в план" : "В план (без даты)"}
    </Button>
  )
}
