import type { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Entrium AI",
  robots: { index: false, follow: false },
}

export default function TgLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      <div className="min-h-dvh bg-background text-foreground">{children}</div>
    </>
  )
}
