"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Share2, Copy, Check, Eye, EyeOff, Globe, Lock, Unlock, ExternalLink, Loader2,
} from "lucide-react"
import {
  enableSharing, disableSharing, type SharingStatus,
} from "@/lib/share/actions"
import { cn } from "@/lib/utils"

export function ShareCard({ initial }: { initial: SharingStatus }) {
  const [status, setStatus] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [editingSlug, setEditingSlug] = useState(false)
  const [slugDraft, setSlugDraft] = useState(initial.slug ?? "")

  const isShared = status.visibility !== "private"

  function setVisibility(v: "unlisted" | "public") {
    startTransition(async () => {
      const r = await enableSharing(v)
      if (!r.ok) {
        toast.error(errMsg(r.error))
        return
      }
      setStatus((s) => ({
        ...s,
        visibility: v,
        slug: r.slug ?? s.slug,
        link: r.slug ? `${origin()}/p/${r.slug}` : s.link,
      }))
      toast.success(v === "public" ? "Профиль публичен" : "Профиль доступен по прямой ссылке")
    })
  }

  function disable() {
    startTransition(async () => {
      const r = await disableSharing()
      if (!r.ok) {
        toast.error(errMsg(r.error))
        return
      }
      setStatus((s) => ({ ...s, visibility: "private" }))
      toast.success("Публичный доступ отключён")
    })
  }

  function copyLink() {
    if (!status.link) return
    navigator.clipboard?.writeText(status.link)
    setCopied(true)
    toast.success("Ссылка скопирована")
    setTimeout(() => setCopied(false), 2000)
  }

  function saveSlug() {
    const s = slugDraft.trim()
    if (!s) return setEditingSlug(false)
    startTransition(async () => {
      const r = await enableSharing(
        status.visibility === "private" ? "unlisted" : (status.visibility as "public" | "unlisted"),
        s
      )
      if (!r.ok) {
        toast.error(errMsg(r.error))
        return
      }
      setStatus((cur) => ({
        ...cur,
        slug: r.slug ?? cur.slug,
        link: r.slug ? `${origin()}/p/${r.slug}` : cur.link,
        visibility: cur.visibility === "private" ? "unlisted" : cur.visibility,
      }))
      setEditingSlug(false)
      toast.success("Ссылка обновлена")
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/15 shrink-0">
          <Share2 className="h-5 w-5 text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg">Публичная ссылка</h3>
            <VisibilityBadge v={status.visibility} />
          </div>
          <p className="font-serif text-sm text-cream-2 leading-relaxed">
            Покажи свой профиль одним URL — для консультанта, ментора, родителей. Контакты и заметки скрыты.
          </p>
        </div>
      </div>

      {/* Visibility radio */}
      <div className="grid grid-cols-3 gap-2">
        <Option
          icon={Lock}
          label="Приватно"
          desc="Только ты"
          active={status.visibility === "private"}
          onClick={disable}
          disabled={pending}
        />
        <Option
          icon={EyeOff}
          label="По ссылке"
          desc="Кому отправил"
          active={status.visibility === "unlisted"}
          onClick={() => setVisibility("unlisted")}
          disabled={pending}
        />
        <Option
          icon={Globe}
          label="Публично"
          desc="Видно всем"
          active={status.visibility === "public"}
          onClick={() => setVisibility("public")}
          disabled={pending}
        />
      </div>

      {/* Link + slug edit */}
      {isShared && status.slug && (
        <div className="space-y-3 border-t border-border/40 pt-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
            <code className="text-sm font-mono text-cream-2 truncate flex-1 min-w-0">{status.link}</code>
            <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5 shrink-0">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "OK" : "Копировать"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {editingSlug ? (
              <>
                <Input
                  value={slugDraft}
                  onChange={(e) => setSlugDraft(e.target.value.toLowerCase())}
                  placeholder="my-name"
                  className="max-w-[200px] h-8"
                />
                <Button size="sm" onClick={saveSlug} disabled={pending}>
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingSlug(false); setSlugDraft(status.slug ?? "") }}>
                  Отмена
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditingSlug(true)}>
                  Изменить slug
                </Button>
                <a href={status.link} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Открыть превью
                  </Button>
                </a>
                <span className="text-xs font-mono-label text-cream-3 ml-auto">
                  <Eye className="inline h-3 w-3 mr-1" />
                  {status.views} просмотров
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] font-mono-label text-cream-3 pt-2 border-t border-border/40">
        Что показывается: имя, цели, GPA / тесты, награды, активности, проекты, заявки (название уни + статус). НЕ показываются: email, телефон, заметки, эссе, оценки от AI.
      </p>
    </div>
  )
}

function Option({
  icon: Icon,
  label,
  desc,
  active,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  desc: string
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors",
        active
          ? "border-gold/40 bg-gold/10"
          : "border-border bg-card/40 hover:bg-card hover:border-gold/30",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Icon className={cn("h-4 w-4 mb-1.5", active ? "text-gold" : "text-cream-3")} />
      <p className={cn("font-display text-sm", active && "text-gold")}>{label}</p>
      <p className="font-mono-label text-[10px] text-cream-3">{desc}</p>
    </button>
  )
}

function VisibilityBadge({ v }: { v: "private" | "unlisted" | "public" }) {
  if (v === "public") {
    return <Badge className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">PUBLIC</Badge>
  }
  if (v === "unlisted") {
    return <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">UNLISTED</Badge>
  }
  return <Badge className="text-[10px] bg-cream-3/15 text-cream-3 border-cream-3/30">PRIVATE</Badge>
}

function origin(): string {
  if (typeof window !== "undefined") return window.location.origin
  return ""
}

function errMsg(code?: string): string {
  switch (code) {
    case "slug_taken":
      return "Этот slug уже занят. Попробуй другой."
    case "unauthorized":
      return "Войди заново"
    case "could_not_generate_slug":
      return "Не удалось сгенерировать ссылку — попробуй ещё раз"
    default:
      return code ?? "Не удалось"
  }
}

// Re-export type for the icon import resolution check
export type { SharingStatus } from "@/lib/share/actions"
