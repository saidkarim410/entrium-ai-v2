"use client"
import { useMemo, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { Markdown } from "@/components/markdown"
import { useTelegram } from "@/lib/telegram/webapp"
import type { AgentSlug } from "@/lib/agents/registry"

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

      <form
        className="sticky bottom-0 flex gap-2 border-t border-border bg-background p-3"
        onSubmit={(e) => {
          e.preventDefault()
          const text = input.trim()
          if (!text) return
          sendMessage({ text })
          setInput("")
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={1}
          placeholder={placeholder}
          className="flex-1 resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={streaming}
          aria-label="Отправить"
          className="rounded-xl bg-[var(--brand-red)] px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          →
        </button>
      </form>
    </div>
  )
}
