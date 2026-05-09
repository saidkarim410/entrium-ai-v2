import { test, expect } from "@playwright/test"

/**
 * Smoke E2E tests (Q-1 from TZ_FULLSTACK.md, expansion).
 *
 * Verifies the production deployment is alive and serves the public
 * pages. Doesn't require a logged-in user — runs against /, /login,
 * /scholarships, /universities, /pricing.
 *
 * Auth-gated pages (/dashboard, /applications etc) are tested only
 * for "redirects to /login" because the proxy middleware blocks them.
 */

test.describe("Public pages render", () => {
  test("homepage loads", async ({ page }) => {
    const res = await page.goto("/")
    expect(res?.status()).toBeLessThan(400)
    await expect(page).toHaveTitle(/Entrium/i)
  })

  test("login page loads", async ({ page }) => {
    const res = await page.goto("/login")
    expect(res?.status()).toBeLessThan(400)
    // Login page shows a sign-in form
    await expect(page.locator("body")).toContainText(/Entrium|Войти|Sign in/i)
  })

  test("scholarships catalog loads", async ({ page }) => {
    const res = await page.goto("/scholarships")
    expect(res?.status()).toBeLessThan(400)
  })

  test("universities catalog loads", async ({ page }) => {
    const res = await page.goto("/universities")
    expect(res?.status()).toBeLessThan(400)
  })

  test("pricing page loads", async ({ page }) => {
    const res = await page.goto("/pricing")
    expect(res?.status()).toBeLessThan(400)
  })
})

test.describe("API health", () => {
  test("/api/health returns ok=true", async ({ request }) => {
    const res = await request.get("/api/health")
    expect(res.ok()).toBeTruthy()
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.integrations).toBeDefined()
  })
})

test.describe("Security headers", () => {
  test("/ returns CSP and HSTS", async ({ request }) => {
    const res = await request.get("/")
    const csp = res.headers()["content-security-policy"]
    const hsts = res.headers()["strict-transport-security"]
    const perms = res.headers()["permissions-policy"]
    expect(csp).toBeTruthy()
    expect(csp).toContain("default-src 'self'")
    expect(hsts).toBeTruthy()
    expect(hsts).toContain("max-age=")
    expect(perms).toBeTruthy()
    expect(perms).toContain("microphone=(self)")
  })

  test("X-Frame-Options is DENY", async ({ request }) => {
    const res = await request.get("/")
    expect(res.headers()["x-frame-options"]).toBe("DENY")
  })
})

test.describe("Auth gating", () => {
  test("/dashboard redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("/applications redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto("/applications")
    await expect(page).toHaveURL(/\/login/)
  })
})
