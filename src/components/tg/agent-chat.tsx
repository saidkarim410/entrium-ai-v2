"use client"
import { useMemo, useRef, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Loader2, Mic, Square } from "lucide-react"
import { Markdown } from "@/components/markdown"
import { useTelegram } from "@/lib/telegram/webapp"
import type { AgentSlug } from "@/lib/agents/registry"

type VoiceState = "idle" | "recording" | "transcribing"

export function AgentChat({ tool, placeholder }: { tool: AgentSlug; placeholder: string }) {
  const { initData, ready } = useTelegram()

  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Загрузка…</div>
  if (!initData)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Открой это приложение через бота <b>@entriumleedbot</b>.
      </div>
    )

  return <AgentChatInner tool={tool} placeholder={placeholder} initData={initData} />
}

function AgentChatInner({
  tool,
  placeholder,
  initData,
}: {
  tool: AgentSlug
  placeholder: string
  initData: string
}) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/tg/chat",
        headers: { "x-telegram-init-data": initData },
        body: { tool },
      }),
    [initData, tool],
  )
  const { messages, sendMessage, status, error } = useChat({ transport })
  const [input, setInput] = useState("")
  const streaming = status === "submitted" || status === "streaming"

  // ── Voice recording state ─────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>("idle")
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  async function startRecording() {
    setVoiceError(null)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setVoiceError(
        "Не удалось включить микрофон — разреши доступ или печатай текстом.",
      )
      return
    }

    chunksRef.current = []
    const recorder = new MediaRecorder(stream)
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      // Stop all tracks so the mic indicator disappears
      stream.getTracks().forEach((t) => t.stop())

      const blob = new Blob(chunksRef.current, { type: "audio/webm" })
      chunksRef.current = []

      if (blob.size < 100) {
        setVoiceError("Запись слишком короткая — попробуй ещё раз.")
        setVoiceState("idle")
        return
      }

      setVoiceState("transcribing")
      try {
        const fd = new FormData()
        fd.append("audio", blob)
        const res = await fetch("/api/tg/voice/transcribe", {
          method: "POST",
          headers: { "x-telegram-init-data": initData },
          body: fd,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          const msg = (body as { message?: string }).message
          setVoiceError(
            msg ?? "Ошибка распознавания — попробуй ещё раз или печатай текстом.",
          )
        } else {
          const { text } = (await res.json()) as { text: string }
          if (text) {
            setInput((prev) => (prev ? `${prev} ${text}` : text))
          }
        }
      } catch {
        setVoiceError("Нет соединения — проверь интернет и попробуй ещё раз.")
      } finally {
        setVoiceState("idle")
      }
    }

    recorder.start()
    setVoiceState("recording")
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      // voiceState → "transcribing" is set inside onstop
    }
  }

  function handleMicClick() {
    if (voiceState === "idle") {
      void startRecording()
    } else if (voiceState === "recording") {
      stopRecording()
    }
    // "transcribing" → button is disabled
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-3 px-4 py-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={
                m.role === "user"
                  ? "inline-block rounded-2xl rounded-br-sm bg-[var(--brand-red)] px-3 py-2 text-left text-sm text-white"
                  : "rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-sm"
              }
            >
              {m.parts
                .filter((p) => p.type === "text")
                .map((p, i) =>
                  m.role === "user" ? (
                    <span key={i}>{(p as { text: string }).text}</span>
                  ) : (
                    <Markdown key={i}>{(p as { text: string }).text}</Markdown>
                  ),
                )}
            </div>
          </div>
        ))}
        {streaming && (
          <div className="text-xs text-[var(--brand-red)]">
            печатает…<span className="brand-caret" />
          </div>
        )}
        {error && <div className="text-xs text-destructive">Ошибка. Попробуй ещё раз.</div>}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background">
        {voiceError && (
          <p className="px-3 pt-2 text-xs text-destructive">{voiceError}</p>
        )}
        {voiceState === "recording" && (
          <p className="px-3 pt-2 text-xs text-[var(--brand-red)]">Запись… нажми ещё раз, чтобы остановить.</p>
        )}
        {voiceState === "transcribing" && (
          <p className="px-3 pt-2 text-xs text-muted-foreground">Распознаю речь…</p>
        )}
        <form
          className="flex gap-2 p-3"
          onSubmit={(e) => {
            e.preventDefault()
            const text = input.trim()
            if (!text) return
            sendMessage({ text })
            setInput("")
            setVoiceError(null)
          }}
        >
          {/* Mic button — left of textarea */}
          <button
            type="button"
            aria-label="Записать голос"
            disabled={voiceState === "transcribing"}
            onClick={handleMicClick}
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
              voiceState === "recording"
                ? "border-[var(--brand-red)] bg-[var(--brand-red)] text-white"
                : "border-input bg-card text-muted-foreground hover:text-foreground",
              voiceState === "transcribing" ? "opacity-50 cursor-not-allowed" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {voiceState === "transcribing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : voiceState === "recording" ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder={placeholder}
            className="flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={streaming || voiceState === "recording" || voiceState === "transcribing"}
            aria-label="Отправить"
            className="rounded-xl bg-[var(--brand-red)] px-4 text-sm font-medium text-white disabled:opacity-50"
          >
            →
          </button>
        </form>
      </div>
    </div>
  )
}
