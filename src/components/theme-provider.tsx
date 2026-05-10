"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Wraps next-themes for the Entrium light/dark theme system
 * (U-10 from TZ_FULLSTACK.md).
 *
 * - `defaultTheme: "dark"` keeps existing behaviour unchanged for
 *   users who haven't explicitly chosen a theme yet.
 * - `enableSystem` lets the browser's prefers-color-scheme drive the
 *   default before the user picks; the `system` value resolves at runtime.
 * - `attribute="class"` adds `light` or `dark` className to <html>,
 *   matching the `:root.light` rules in globals.css.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
