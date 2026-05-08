"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useT } from "@/lib/i18n/client"
import { signupAction, type AuthState } from "../actions"
import { GoogleButton } from "../google-button"
import { TelegramButton } from "../telegram-button"
import { RefCapture } from "@/components/ref-capture"

const initialState: AuthState = {}

export default function SignupPage() {
  const t = useT()
  const [state, formAction, pending] = useActionState(signupAction, initialState)

  return (
    <div className="space-y-6">
      <RefCapture />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.auth.signup_title}</h1>
        <p className="text-sm text-muted-foreground">
          {t.auth.signup_have_account}{" "}
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            {t.auth.signup_login_link}
          </Link>
        </p>
      </div>
      <GoogleButton />
      <TelegramButton />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-background px-2 text-muted-foreground">{t.auth.or_email}</span>
        </div>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">{t.auth.full_name}</Label>
          <Input id="fullName" name="fullName" placeholder="" required autoComplete="name" />
          {state.fieldErrors?.fullName && (
            <p className="text-xs text-destructive">{state.fieldErrors.fullName[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
          {state.fieldErrors?.email && (
            <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t.auth.password}</Label>
          <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
          {state.fieldErrors?.password && (
            <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p>
          )}
        </div>
        {state.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t.auth.submit_signup_loading : t.auth.submit_signup}
        </Button>
        <p className="text-xs text-center text-muted-foreground">{t.auth.terms_note}</p>
      </form>
    </div>
  )
}
