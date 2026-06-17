"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Mic, MicOff, PhoneOff, Loader2, Sparkles, Radio,
} from "lucide-react"
import { cn } from "@/lib/utils"

type Phase = "idle" | "connecting" | "live" | "ended"

type Transcript = {
  id: string
  role: "user" | "assistant"
  text: string
  partial: boolean
}

const VOICES = [
  { id: "alloy" as const, label: "Alloy · нейтральный" },
  { id: "verse" as const, label: "Verse · теплый" },
  { id: "shimmer" as const, label: "Shimmer · мягкий" },
  { id: "ash" as const, label: "Ash · уверенный" },
  { id: "coral" as const, label: "Coral · дружелюбный" },
  { id: "sage" as const, label: "Sage · спокойный" },
]

export function VoiceSession({
  uni,
  major,
  type,
  lang,
  onExit,
}: {
  uni: string
  major: string
  type: string
  lang: string
  onExit: () => void
}) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [muted, setMuted] = useState(false)
  const [voice, setVoice] = useState<(typeof VOICES)[number]["id"]>("alloy")
  const [transcripts, setTranscripts] = useState<Transcript[]>([])
  const [error, setError] = useState<string | null>(null)
  const [aiSpeaking, setAiSpeaking] = useState(false)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const transcriptsRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptsRef.current) {
      transcriptsRef.current.scrollTop = transcriptsRef.current.scrollHeight
    }
  }, [transcripts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hardStop()
    }
  }, [])

  async function start() {
    setError(null)
    setPhase("connecting")
    setTranscripts([])

    try {
      // 1. Get ephemeral token from our server
      const tokenRes = await fetch("/api/realtime/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uni, major, type, lang, voice }),
      })
      const tokenJson = await tokenRes.json()
      if (!tokenRes.ok || !tokenJson.token) {
        throw new Error(tokenJson.message ?? tokenJson.error ?? "не удалось получить токен")
      }

      // 2. Mic permission
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch {
        throw new Error("Доступ к микрофону отклонён или не поддерживается")
      }
      localStreamRef.current = stream

      // 3. Build RTCPeerConnection
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // Remote audio playback
      pc.ontrack = (e) => {
        if (audioElRef.current) {
          audioElRef.current.srcObject = e.streams[0]
        }
      }

      // Add mic
      stream.getTracks().forEach((t) => pc.addTrack(t, stream))

      // Data channel for events
      const dc = pc.createDataChannel("oai-events")
      dcRef.current = dc

      dc.addEventListener("open", () => {
        setPhase("live")
        // Politely greet the candidate
        sendDC({
          type: "response.create",
          response: {
            instructions: "Begin the interview by greeting the candidate and asking your first question. Keep it warm and brief.",
          },
        })
      })
      dc.addEventListener("message", (e) => {
        try {
          const event = JSON.parse(e.data)
          handleRealtimeEvent(event)
        } catch (err) {
          console.error("bad realtime event", err)
        }
      })

      // 4. SDP offer/answer dance
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tokenJson.token}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      )
      if (!sdpRes.ok) {
        throw new Error(`Realtime SDP exchange ${sdpRes.status}`)
      }
      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Connection failed"
      setError(msg)
      setPhase("ended")
      hardStop()
      toast.error(msg)
    }
  }

  function sendDC(payload: unknown) {
    const dc = dcRef.current
    if (dc && dc.readyState === "open") {
      dc.send(JSON.stringify(payload))
    }
  }

  function handleRealtimeEvent(event: { type: string; [k: string]: unknown }) {
    switch (event.type) {
      case "response.audio.start":
      case "response.output_audio.delta":
        setAiSpeaking(true)
        break
      case "response.audio.done":
      case "response.output_audio.done":
      case "response.done":
        setAiSpeaking(false)
        break

      case "conversation.item.input_audio_transcription.delta": {
        const itemId = String(event.item_id ?? "")
        const delta = String(event.delta ?? "")
        appendDelta("user", itemId, delta, true)
        break
      }
      case "conversation.item.input_audio_transcription.completed": {
        const itemId = String(event.item_id ?? "")
        const text = String(event.transcript ?? "")
        finalizeTranscript("user", itemId, text)
        break
      }

      case "response.audio_transcript.delta":
      case "response.output_audio_transcript.delta": {
        const itemId = String(event.item_id ?? event.response_id ?? "ai")
        const delta = String(event.delta ?? "")
        appendDelta("assistant", itemId, delta, true)
        break
      }
      case "response.audio_transcript.done":
      case "response.output_audio_transcript.done": {
        const itemId = String(event.item_id ?? event.response_id ?? "ai")
        const text = String(event.transcript ?? "")
        finalizeTranscript("assistant", itemId, text)
        break
      }

      case "error":
        console.error("Realtime error:", event)
        toast.error(typeof event.error === "object" ? JSON.stringify(event.error).slice(0, 200) : "Realtime error")
        break
    }
  }

  function appendDelta(role: "user" | "assistant", id: string, delta: string, partial: boolean) {
    setTranscripts((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx >= 0) {
        const next = prev.slice()
        next[idx] = { ...next[idx], text: next[idx].text + delta, partial }
        return next
      }
      return [...prev, { id, role, text: delta, partial }]
    })
  }

  function finalizeTranscript(role: "user" | "assistant", id: string, text: string) {
    setTranscripts((prev) => {
      const idx = prev.findIndex((t) => t.id === id)
      if (idx >= 0) {
        const next = prev.slice()
        next[idx] = { ...next[idx], text, partial: false }
        return next
      }
      return [...prev, { id, role, text, partial: false }]
    })
  }

  function toggleMute() {
    const stream = localStreamRef.current
    if (!stream) return
    const next = !muted
    stream.getAudioTracks().forEach((t) => (t.enabled = !next))
    setMuted(next)
  }

  function requestFeedback() {
    sendDC({
      type: "response.create",
      response: {
        instructions:
          "Drop the interviewer role NOW. As an admission coach, give specific feedback: one biggest strength of the candidate, two weaknesses, and one rewritten sample answer for their weakest moment. Keep it under 90 seconds.",
      },
    })
  }

  function hardStop() {
    try {
      dcRef.current?.close()
    } catch {}
    try {
      pcRef.current?.getSenders().forEach((s) => s.track?.stop())
      pcRef.current?.close()
    } catch {}
    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop())
    } catch {}
    pcRef.current = null
    dcRef.current = null
    localStreamRef.current = null
    setAiSpeaking(false)
  }

  function endSession() {
    hardStop()
    setPhase("ended")
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono-label text-[11px] text-gold uppercase tracking-wider">Voice mode</p>
            <h2 className="font-display text-2xl tracking-tight">Голосовое интервью · {uni}</h2>
            <p className="font-mono-label text-[11px] text-cream-3">{[major, type, lang].filter(Boolean).join(" · ")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { hardStop(); onExit() }}>
            ← Выйти
          </Button>
        </div>

        {/* Status panel */}
        {phase === "idle" && (
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gold/20 shrink-0">
                <Mic className="h-6 w-6 text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-xl">Готов к голосовому интервью?</p>
                <p className="font-serif text-sm text-cream-2 leading-relaxed mt-1">
                  AI-интервьюер заговорит с тобой как настоящий admission officer. Отвечай голосом —
                  он услышит, ответит, задаст уточняющий вопрос. В конце скажи «обратная связь»,
                  чтобы получить разбор.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">Голос</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value as typeof voice)}
                  className="mt-1 w-full h-9 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:border-gold/60"
                >
                  {VOICES.map((v) => (
                    <option key={v.id} value={v.id} className="bg-background">
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button onClick={start} className="w-full h-12 gap-2">
              <Mic className="h-4 w-4" />
              Начать голосовое интервью
            </Button>
            <p className="text-[10px] font-mono-label text-cream-3 text-center">
              Браузер попросит разрешение на микрофон. Используй наушники для лучшего звука.
            </p>
          </div>
        )}

        {phase === "connecting" && (
          <div className="rounded-xl border border-border bg-card/40 p-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 text-gold animate-spin" />
            <p className="font-display text-base">Подключаюсь к OpenAI Realtime...</p>
          </div>
        )}

        {phase === "live" && (
          <>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Radio className={cn("h-5 w-5", aiSpeaking ? "text-gold animate-pulse" : "text-emerald-400")} />
                    {aiSpeaking && (
                      <span className="absolute -inset-1 rounded-full bg-gold/30 animate-ping" />
                    )}
                  </div>
                  <div>
                    <p className="font-display text-base">
                      {aiSpeaking ? "AI говорит..." : muted ? "Микрофон выключен" : "Слушаю тебя"}
                    </p>
                    <p className="font-mono-label text-[10px] text-cream-3">
                      WebRTC · OpenAI Realtime · gpt-realtime
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={toggleMute} className="gap-2">
                    {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    {muted ? "Включить" : "Mute"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={requestFeedback} className="gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-gold" />
                    Обратная связь
                  </Button>
                  <Button variant="destructive" size="sm" onClick={endSession} className="gap-2">
                    <PhoneOff className="h-3.5 w-3.5" />
                    Завершить
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {phase === "ended" && (
          <div className="rounded-xl border border-border bg-card/40 p-5 space-y-3 text-center">
            <p className="font-display text-lg">Сессия завершена</p>
            <p className="font-serif text-sm text-cream-2">
              {error ? error : "Можешь начать ещё раз — каждое интервью отличается, тренируйся."}
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={() => setPhase("idle")}>Ещё раз</Button>
              <Button variant="outline" onClick={onExit}>Назад к настройкам</Button>
            </div>
          </div>
        )}

        {/* Transcript */}
        {(phase === "live" || phase === "ended") && transcripts.length > 0 && (
          <div className="rounded-xl border border-border bg-card/30 p-4 space-y-3">
            <p className="font-mono-label text-[11px] text-cream-3 uppercase tracking-wider">Транскрипт</p>
            <div
              ref={transcriptsRef}
              className="max-h-[50vh] overflow-y-auto space-y-3 pr-1"
            >
              {transcripts.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "flex flex-col gap-1",
                    t.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <span className="font-mono-label text-[9px] text-cream-3">
                    {t.role === "user" ? "ТЫ" : "AI INTERVIEWER"}
                  </span>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed font-serif",
                      t.role === "user"
                        ? "bg-gold/15 text-cream rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm",
                      t.partial && "italic opacity-80"
                    )}
                  >
                    {t.text || (t.partial ? "..." : "")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden audio element for AI playback */}
        <audio ref={audioElRef} autoPlay playsInline className="hidden" />

        <p className="text-[10px] font-mono-label text-cream-3 text-center">
          Voice mode = безопасно (не записывается). Можно прервать в любой момент.
        </p>
      </div>
    </div>
  )
}
