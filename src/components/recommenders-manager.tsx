"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Users2, UserPlus, Mail, Clock, Check, X, ExternalLink, Copy, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/empty-state"
import {
  createRecommenderInvite,
  revokeRecommenderInvite,
} from "@/lib/recommenders/actions"
import type { RecommenderInvite } from "@/lib/recommenders/types"
import { cn } from "@/lib/utils"

/**
 * F-2 (TZ): UI for managing recommender invites.
 *
 * Student picks a name + email → we send the recommender an email with
 * a one-time URL. Student sees a status badge per invite (pending,
 * opened, submitted) and can revoke or copy the link manually if email
 * delivery fails.
 */

const STATUS_STYLES: Record<RecommenderInvite["status"], { chip: string; label: string }> = {
  pending:   { chip: "bg-cream-3/15 text-cream-2 border-cream-3/30",       label: "Отправлено" },
  opened:    { chip: "bg-blue-500/15 text-blue-300 border-blue-500/30",    label: "Открыто" },
  submitted: { chip: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", label: "Получено" },
  expired:   { chip: "bg-rose-500/15 text-rose-300 border-rose-500/30",    label: "Истекло" },
}

export function RecommendersManager({ initial }: { initial: RecommenderInvite[] }) {
  const [items, setItems] = useState<RecommenderInvite[]>(initial)
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 sm:p-6 accent-strip space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-mono-label text-cream-3">Рекомендатели</p>
          <p className="font-serif text-xs text-cream-3 mt-0.5">
            Учителя/директора грузят PDF без регистрации по одноразовой ссылке
          </p>
        </div>
        {!open && (
          <Button onClick={() => setOpen(true)} variant="outline" className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4 text-gold" />
            Пригласить
          </Button>
        )}
      </div>

      {open && (
        <InviteForm
          onCancel={() => setOpen(false)}
          onCreated={(invite) => {
            setItems((cur) => [invite, ...cur])
            setOpen(false)
          }}
        />
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="Пока никого не приглашено"
          description="Введи имя и email учителя — мы отправим письмо с одноразовой ссылкой для загрузки рекомендации. Они не должны регистрироваться."
          variant="bare"
        />
      ) : (
        <ol className="space-y-2">
          {items.map((inv) => (
            <InviteRow
              key={inv.id}
              invite={inv}
              onRevoked={() => setItems((cur) => cur.filter((x) => x.id !== inv.id))}
            />
          ))}
        </ol>
      )}
    </div>
  )
}

function InviteForm({
  onCreated,
  onCancel,
}: {
  onCreated: (invite: RecommenderInvite) => void
  onCancel: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("")
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!name.trim() || !email.trim()) {
      toast.error("Имя и email обязательны")
      return
    }
    startTransition(async () => {
      const res = await createRecommenderInvite({
        recommenderName: name,
        recommenderEmail: email,
        recommenderRole: role,
        message,
      })
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось создать приглашение")
        return
      }
      toast.success("Приглашение отправлено")
      // Build a synthetic row — page will refresh on next focus, but
      // for the optimistic insert we keep the user-typed data.
      onCreated({
        id: res.id!,
        user_id: "",
        recommender_name: name.trim(),
        recommender_email: email.trim().toLowerCase(),
        recommender_role: role.trim() || null,
        token: res.token!,
        message: message.trim() || null,
        status: "pending",
        expires_at: new Date(Date.now() + 60 * 86_400_000).toISOString(),
        opened_at: null,
        submitted_at: null,
        created_at: new Date().toISOString(),
      })
    })
  }

  return (
    <div className="rounded-lg border border-gold/30 bg-gold/5 p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">Имя *</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Анна Петрова"
            disabled={pending}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">Email *</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="anna@school.uz"
            disabled={pending}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">Роль (опц)</Label>
        <Input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Учительница математики · 3 года"
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="font-mono-label text-[10px] text-cream-3 uppercase tracking-wider">
          Личное сообщение (опц)
        </Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Анна Сергеевна, прошу написать рекомендацию для подачи в MIT — дедлайн 1 ноября..."
          rows={3}
          disabled={pending}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Отмена
        </Button>
        <Button onClick={submit} size="sm" disabled={pending} className="gap-2">
          <Mail className="h-3.5 w-3.5" />
          {pending ? "Отправляю..." : "Отправить приглашение"}
        </Button>
      </div>
    </div>
  )
}

function InviteRow({
  invite,
  onRevoked,
}: {
  invite: RecommenderInvite
  onRevoked: () => void
}) {
  const [pending, startTransition] = useTransition()
  const styles = STATUS_STYLES[invite.status]
  const link = typeof window !== "undefined"
    ? `${window.location.origin}/r/${invite.token}`
    : `/r/${invite.token}`

  function copyLink() {
    navigator.clipboard?.writeText(link)
    toast.success("Ссылка скопирована")
  }

  function clickRevoke() {
    if (!confirm(`Отозвать приглашение для ${invite.recommender_name}?`)) return
    startTransition(async () => {
      const res = await revokeRecommenderInvite(invite.id)
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось отозвать")
        return
      }
      onRevoked()
    })
  }

  return (
    <li>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card/30 p-3">
        <div className={cn("grid place-items-center h-9 w-9 rounded-md border shrink-0", styles.chip)}>
          {invite.status === "submitted" ? (
            <Check className="h-4 w-4" />
          ) : invite.status === "expired" ? (
            <X className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display text-sm truncate">{invite.recommender_name}</p>
            <span className={cn("rounded-full border px-1.5 py-0 text-[10px] font-mono-label uppercase tracking-wider", styles.chip)}>
              {styles.label}
            </span>
          </div>
          <p className="font-mono-label text-[10px] text-cream-3 truncate">
            {invite.recommender_email}
            {invite.recommender_role && ` · ${invite.recommender_role}`}
          </p>
        </div>
        {invite.status !== "submitted" && (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={copyLink}
              aria-label="Копировать ссылку"
              title="Копировать ссылку"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Link
              href={`/r/${invite.token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-grid h-8 w-8 place-items-center rounded-md hover:bg-card transition-colors"
              aria-label="Открыть форму рекомендателя"
              title="Превью"
            >
              <ExternalLink className="h-3.5 w-3.5 text-cream-3" />
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clickRevoke}
              disabled={pending}
              aria-label="Отозвать приглашение"
              title="Отозвать"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </li>
  )
}
