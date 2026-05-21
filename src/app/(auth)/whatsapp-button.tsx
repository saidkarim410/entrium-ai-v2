"use client"

import { useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, MessageCircle, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

/**
 * WhatsApp OTP login via Supabase Phone Auth (channel = "whatsapp").
 *
 * Setup checklist (one-time, by an operator):
 *   1. Supabase Dashboard → Authentication → Providers → Phone
 *      • Enable, choose Twilio as provider
 *      • Account SID, Auth Token, Messaging Service SID (with WhatsApp sender)
 *   2. Twilio Console
 *      • Verify the WhatsApp business account / sender
 *      • Submit the OTP template if required (in some regions)
 *
 * Flow:
 *   step "enter-phone"   → user types phone in E.164 → signInWithOtp({ phone, channel: "whatsapp" })
 *   step "enter-code"    → user types 6-digit OTP   → verifyOtp({ phone, token, type: "sms" })
 *   After successful verification, Supabase issues a session → we trigger
 *   /auth/callback so the profile row + redirect into the app run normally.
 */
export function WhatsAppButton({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"enter-phone" | "enter-code">("enter-phone")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)

  const supabase = () =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

  function reset() {
    setStep("enter-phone")
    setPhone("")
    setCode("")
    setPending(false)
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = phone.trim()
    if (!/^\+\d{8,15}$/.test(trimmed)) {
      toast.error("Введи номер в формате +998901234567")
      return
    }
    setPending(true)
    const { error } = await supabase().auth.signInWithOtp({
      phone: trimmed,
      // Supabase >=2.62 added the "whatsapp" channel
      options: { channel: "whatsapp" as never },
    })
    setPending(false)
    if (error) {
      toast.error(error.message || "Не удалось отправить код")
      return
    }
    toast.success("Код отправлен в WhatsApp")
    setStep("enter-code")
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    const trimmedCode = code.trim()
    if (!/^\d{4,8}$/.test(trimmedCode)) {
      toast.error("Введи код из WhatsApp")
      return
    }
    setPending(true)
    const { error } = await supabase().auth.verifyOtp({
      phone: phone.trim(),
      token: trimmedCode,
      type: "sms",
    })
    setPending(false)
    if (error) {
      toast.error(error.message || "Неверный код")
      return
    }
    // Best-effort: patch profile with whatsapp_phone + whatsapp_verified.
    // Failure here doesn't block login (user can finish onboarding either way).
    fetch("/api/auth/whatsapp/link", { method: "POST" }).catch(() => null)
    toast.success("Вход выполнен")
    setOpen(false)
    reset()
    router.replace(next)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset() }}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full h-10 gap-2"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.3 3.2.2.2 2.2 3.4 5.3 4.8 2.6 1 3.1.8 3.7.8.6 0 1.7-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"
              fill="#fff"
            />
            <path
              d="M21 12a9 9 0 1 1-17.3-3.6L3 21l3.7-1A9 9 0 0 0 21 12z"
              fill="#25D366"
            />
            <path
              d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1.1 1.1-1.1 2.6 0 1.5 1.1 3 1.3 3.2.2.2 2.2 3.4 5.3 4.8 2.6 1 3.1.8 3.7.8.6 0 1.7-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"
              fill="#fff"
            />
          </svg>
          Продолжить с WhatsApp
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {step === "enter-phone" ? "Вход через WhatsApp" : "Введи код из WhatsApp"}
          </DialogTitle>
          <DialogDescription>
            {step === "enter-phone"
              ? "Мы пришлём 6-значный код в WhatsApp на твой номер."
              : `Код отправлен на ${phone}. Проверь WhatsApp.`}
          </DialogDescription>
        </DialogHeader>

        {step === "enter-phone" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wa-phone">Номер телефона</Label>
              <Input
                id="wa-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+998901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="text-xs text-foreground/60">Формат E.164: + и цифры, без пробелов</p>
            </div>
            <Button type="submit" disabled={pending} className="w-full gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {pending ? "Отправляем..." : "Получить код в WhatsApp"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="wa-code">Код подтверждения</Label>
              <Input
                id="wa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                maxLength={8}
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Подтвердить и войти"}
            </Button>
            <button
              type="button"
              onClick={() => setStep("enter-phone")}
              className="text-xs text-foreground/60 hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Изменить номер
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
