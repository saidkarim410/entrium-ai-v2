import { defineConfig } from "vitest/config"
import tsconfigPaths from "vite-tsconfig-paths"

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Exclude Playwright e2e dir explicitly — vitest's default would pick
    // up *.spec.ts and try to run them as unit tests, which fails on
    // Playwright's `test()` import.
    exclude: ["node_modules", ".next", "e2e"],
    // Don't try to load Next.js-specific modules (server cache, etc.) in tests
    // — we test pure helpers only.
    globals: false,
    // Cold-start dynamic import of '@/lib/email' (Resend SDK transitive deps)
    // can exceed the 5s default on slow CI runners. 30s gives headroom
    // without masking real bugs.
    testTimeout: 30_000,
  },
})
