import Link from "next/link"
import { ProfileForm } from "@/components/tg/profile-form"

export const dynamic = "force-dynamic"

export default function TgProfilePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/90 px-3 py-2 backdrop-blur">
        <Link href="/tg" aria-label="Назад" className="text-lg text-muted-foreground">
          ←
        </Link>
        <div>
          <div className="text-sm font-semibold leading-none">Мой профиль</div>
          <div className="text-[11px] text-muted-foreground">
            Заполни — и агенты будут давать персональные ответы
          </div>
        </div>
      </header>
      <ProfileForm />
    </main>
  )
}
