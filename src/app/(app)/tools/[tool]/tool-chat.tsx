"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useT } from "@/lib/i18n/client"
import { Sparkles, ArrowUp, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ToolSlug =
  | "profile" | "analyzer" | "tracker" | "essay"
  | "humanizer" | "interview" | "scholarship" | "university"

export function ToolChat({ tool, placeholder }: { tool: ToolSlug; placeholder: string }) {
  const t = useT()
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { tool },
    }),
    onError: (err) => {
      toast.error(err.message || t.chat.error_default)
    },
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const isStreaming = status === "submitted" || status === "streaming"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming) return
    sendMessage({ text: input })
    setInput("")
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl mx-auto px-6 py-8">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-[40vh] flex-col items-center justify-center text-center">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="mt-6 text-muted-foreground max-w-md">{t.chat.empty}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-2",
                    message.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                      message.role === "user"
                        ? "bg-foreground text-background"
                        : "bg-accent"
                    )}
                  >
                    {message.parts.map((part, i) =>
                      part.type === "text" ? <span key={i}>{part.text}</span> : null
                    )}
                  </div>
                </div>
              ))}
              {status === "submitted" && (
                <div className="flex items-start">
                  <div className="rounded-2xl bg-accent px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              {error && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error.message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/40 bg-background">
        <form onSubmit={handleSubmit} className="container max-w-3xl mx-auto px-6 py-4">
          <div className="relative rounded-2xl border border-border bg-card focus-within:ring-2 focus-within:ring-ring transition-all">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
              placeholder={placeholder}
              rows={3}
              className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 pr-12"
              disabled={isStreaming}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isStreaming}
              className="absolute bottom-3 right-3 h-8 w-8 rounded-full"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">{t.chat.hint}</p>
        </form>
      </div>
    </div>
  )
}
