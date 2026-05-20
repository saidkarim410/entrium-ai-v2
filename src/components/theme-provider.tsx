"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Wraps next-themes for the Entrium light/dark theme system.
 *
 * Brand v2 is **light by default** (white paper · ink-black · red accent —
 * matches the printed posts and logo). Users who explicitly choose dark via
 * the theme toggle still get a fully styled dark mode. We deliberately do NOT
 * follow `prefers-color-scheme` because many users have OS-level dark mode on
 * and would otherwise never see the brand identity on first visit.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
