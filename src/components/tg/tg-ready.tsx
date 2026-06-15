"use client"
import { useTelegram } from "@/lib/telegram/webapp"

export function TgReady() {
  useTelegram() // fires WebApp.ready()/expand() on mount
  return null
}
