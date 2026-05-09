"use client"

import { toast } from "sonner"

/**
 * Optimistic-delete with undo (U-1 from TZ_FULLSTACK.md).
 *
 * Pattern: caller hides the row immediately, then we wait 5 seconds.
 * If the user clicks Undo, we call `onUndo` (which un-hides the row).
 * Otherwise we call `onConfirm` (which performs the actual deletion).
 *
 * This keeps perceived latency low and gives a safety net against
 * accidental clicks. Pair with soft-delete on the backend so even
 * post-confirm there's a 7-day window to restore from cron-cleanup.
 *
 * Usage:
 *   undoToast({
 *     message: "Application deleted",
 *     onUndo: () => restoreLocalRow(app),
 *     onConfirm: () => fetch(`/api/applications/${app.id}`, { method: "DELETE" }),
 *   })
 */
export function undoToast(opts: {
  message: string
  description?: string
  onUndo: () => void
  onConfirm: () => Promise<unknown> | void
  durationMs?: number
}) {
  const { message, description, onUndo, onConfirm, durationMs = 5000 } = opts
  let undone = false

  const id = toast(message, {
    description,
    duration: durationMs,
    action: {
      label: "Отменить",
      onClick: () => {
        undone = true
        onUndo()
        toast.dismiss(id)
      },
    },
  })

  // After the toast lifetime expires, commit the action — unless undone.
  setTimeout(() => {
    if (!undone) {
      try {
        const res = onConfirm()
        if (res instanceof Promise) {
          res.catch((err) => {
            // Confirm failed — re-show the row and surface the error
            onUndo()
            toast.error("Не удалось удалить", {
              description: err instanceof Error ? err.message : "Сетевая ошибка",
            })
          })
        }
      } catch (err) {
        onUndo()
        toast.error("Не удалось удалить", {
          description: err instanceof Error ? err.message : "Ошибка",
        })
      }
    }
  }, durationMs + 100)
}
