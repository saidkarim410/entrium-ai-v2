"use client"

import { useState, useRef, useEffect } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Markdown } from "@/components/markdown"
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const QUICK_PROMPTS = [
  "Что мне сделать сначала?",
  "Какие у меня шансы в Top-10?",
  "Помоги выбрать страну",
  "Как улучшить эссе?",
]

export function CounselorWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { tool: "counselor" },
    }),
    onError: (err) => {
      toast.error(err.message || "Не удалось получить ответ")
    },
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  // Listen to escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  const isStreaming = status === "submitted" || status === "streaming"

  function send(text: string) {
    if (!text.trim() || isStreaming) return
    sendMessage({ text })
    setInput("")
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <>
      {/* Floating button — sits above mobile bottom-nav (64px) on small screens */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Закрыть AI-консультанта" : "Открыть AI-консультанта"}
        className={cn(
          "fixed bottom-20 right-4 lg:bottom-5 lg:right-5 z-50 grid h-14 w-14 place-items-center rounded-full shadow-lg transition-all",
          "bg-gold text-background hover:bg-gold-soft hover:scale-105",
          open && "rotate-90"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-[10.5rem] right-4 lg:bottom-24 lg:right-5 z-50 flex flex-col rounded-xl border border-border bg-popover shadow-2xl w-[calc(100vw-2rem)] sm:w-[420px] h-[min(70vh,560px)] lg:h-[min(80vh,640px)] overflow-hidden accent-strip">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold/15">
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-base">AI Консультант</p>
              <p className="font-mono-label text-cream-3 text-[9px]">Знает твой профиль</p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center text-center pt-8">
                <Sparkles className="h-8 w-8 text-gold/60 mb-3" />
                <p className="font-display text-lg mb-2">Привет 👋</p>
                <p className="font-serif text-sm text-cream-2 mb-6 leading-relaxed">
                  Спроси что угодно про поступление. Я знаю твой профиль и помогу выбрать инструмент.
                </p>
                <div className="grid grid-cols-1 gap-2 w-full">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      className="text-left text-sm px-3 py-2 rounded-lg border border-border bg-card/40 hover:border-gold/40 hover:bg-card transition-colors font-serif text-cream-2"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col gap-1.5",
                    m.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-gold text-background rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    )}
                  >
                    {m.role === "user" ? (
                      <p className="font-serif whitespace-pre-wrap">
                        {m.parts.map((p, i) =>
                          p.type === "text" ? <span key={i}>{p.text}</span> : null
                        )}
                      </p>
                    ) : (
                      <Markdown>
                        {m.parts
                          .filter((p) => p.type === "text")
                          .map((p) => ("text" in p ? p.text : ""))
                          .join("")}
                      </Markdown>
                    )}
                  </div>
                </div>
              ))
            )}
            {status === "submitted" && (
              <div className="flex items-start">
                <div className="rounded-2xl rounded-bl-sm bg-card border border-border px-3.5 py-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-cream-3" />
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs text-destructive">
                {error.message}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={onSubmit} className="border-t border-border px-3 py-3 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Спроси что угодно..."
                disabled={isStreaming}
                className="w-full bg-card border border-border rounded-full pl-4 pr-11 py-2.5 text-sm text-cream placeholder:text-cream-3 focus:outline-none focus:border-gold/60 transition-colors"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming}
                className="absolute top-1/2 -translate-y-1/2 right-1 h-7 w-7 rounded-full bg-gold text-background hover:bg-gold-soft"
              >
                {isStreaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
