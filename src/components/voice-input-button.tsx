"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Mic, MicOff, Loader2, Square } from "lucide-react"
import { cn } from "@/lib/utils"

const MAX_RECORD_MS = 90 * 1000 // 90s — keeps payload reasonable + fits prompt
const MIME_FALLBACKS = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
] as const

type Phase = "idle" | "recording" | "transcribing" | "error"

/**
 * Microphone button that records audio, sends to /api/voice/transcribe,
 * and calls onTranscript with the result. Append-mode by default — pass
 * mode="replace" to overwrite the field instead.
 *
 * Plug into any textarea by capturing the field's value/setter and using
 * onTranscript to merge.
 */
export function VoiceInputButton({
  onTranscript,
  mode = "append",
  hint,
  size = "sm",
  className,
}: {
  onTranscript: (text: string) => void
  mode?: "append" | "replace"
  /** Optional context hint for whisper (max ~220 chars) — improves names/numbers accuracy */
  hint?: string
  size?: "sm" | "md"
  className?: string
}) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [elapsed, setElapsed] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording(false)
    }
  }, [])

  function pickMimeType(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined
    for (const m of MIME_FALLBACKS) {
      if (MediaRecorder.isTypeSupported(m)) return m
    }
    return undefined
  }

  async function start() {
    setPhase("recording")
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = pickMimeType()
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      recorderRef.current = rec

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        // Stop all tracks to release the mic LED
        stream.getTracks().forEach((t) => t.stop())
        if (tickRef.current) clearInterval(tickRef.current)
        await transcribe()
      }
      rec.start(250) // emit chunks every 250ms

      startedAtRef.current = Date.now()
      setElapsed(0)
      tickRef.current = setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current)
      }, 200)

      // Hard stop after MAX_RECORD_MS
      stopTimeoutRef.current = setTimeout(() => stopRecording(true), MAX_RECORD_MS)
    } catch (err) {
      setPhase("error")
      toast.error(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Доступ к микрофону отклонён"
          : "Не удалось включить микрофон"
      )
      setTimeout(() => setPhase("idle"), 1500)
    }
  }

  function stopRecording(transition = true) {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current)
      stopTimeoutRef.current = null
    }
    const rec = recorderRef.current
    if (rec && rec.state !== "inactive") {
      try { rec.stop() } catch {}
    }
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    if (transition) setPhase("transcribing")
  }

  async function transcribe() {
    const blob = new Blob(chunksRef.current, {
      type: chunksRef.current[0]?.type || "audio/webm",
    })

    // Too short = ignore
    if (blob.size < 800) {
      setPhase("idle")
      toast.message("Слишком коротко — продержи кнопку дольше")
      return
    }

    try {
      const fd = new FormData()
      fd.append("audio", blob)
      if (hint) fd.append("prompt", hint)

      const res = await fetch("/api/voice/transcribe", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.message ?? json.error ?? "Не удалось распознать")
        setPhase("error")
        setTimeout(() => setPhase("idle"), 1500)
        return
      }
      const text = (json.text as string | undefined)?.trim() ?? ""
      if (!text) {
        toast.message("Не услышал речь — попробуй снова")
        setPhase("idle")
        return
      }
      onTranscript(text)
      setPhase("idle")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка")
      setPhase("error")
      setTimeout(() => setPhase("idle"), 1500)
    }
  }

  function click() {
    if (phase === "idle") start()
    else if (phase === "recording") stopRecording(true)
  }

  const dim = size === "md" ? "h-9 w-9" : "h-8 w-8"
  const icon = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"

  return (
    <button
      type="button"
      onClick={click}
      disabled={phase === "transcribing"}
      aria-label={
        phase === "idle" ? `Записать голос (append${mode === "replace" ? " → replace" : ""})` :
        phase === "recording" ? "Остановить запись" :
        phase === "transcribing" ? "Распознаю..." :
        "Ошибка"
      }
      title={
        phase === "idle" ? "Нажми, чтобы записать голос → текст добавится" :
        phase === "recording" ? `Запись... ${(elapsed / 1000).toFixed(0)}s — нажми чтобы остановить` :
        phase === "transcribing" ? "AI распознаёт..." :
        "Ошибка"
      }
      className={cn(
        "grid place-items-center rounded-md border transition-all shrink-0 relative",
        dim,
        phase === "idle" && "bg-card border-border text-cream-3 hover:text-gold hover:border-gold/40",
        phase === "recording" && "bg-rose-500/15 border-rose-500/50 text-rose-300 animate-pulse",
        phase === "transcribing" && "bg-card border-border text-gold cursor-wait",
        phase === "error" && "bg-card border-rose-500/40 text-rose-400",
        className,
      )}
    >
      {phase === "idle" && <Mic className={icon} />}
      {phase === "recording" && <Square className={cn(icon, "fill-current")} />}
      {phase === "transcribing" && <Loader2 className={cn(icon, "animate-spin")} />}
      {phase === "error" && <MicOff className={icon} />}
      {phase === "recording" && (
        <span className="absolute -top-1 -right-1 grid h-3.5 min-w-3.5 px-0.5 place-items-center rounded-full bg-rose-500 text-[8px] font-mono-label text-white">
          {Math.min(99, Math.floor(elapsed / 1000))}
        </span>
      )}
    </button>
  )
}
