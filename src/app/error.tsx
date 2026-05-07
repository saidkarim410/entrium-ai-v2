"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/client"
import { AlertTriangle } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useT()

  useEffect(() => {
    // Sentry will capture if configured
    if (typeof window !== "undefined") {
      import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {})
    }
  }, [error])

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">{t.common.error_title}</h1>
      <p className="mt-3 text-muted-foreground max-w-md">{t.common.error_sub}</p>
      {error.digest && (
        <code className="mt-4 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
          ID: {error.digest}
        </code>
      )}
      <Button onClick={reset} className="mt-8">
        {t.common.retry}
      </Button>
    </div>
  )
}
