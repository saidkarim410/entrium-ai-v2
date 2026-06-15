import { test, expect } from "@playwright/test"

test.describe("Telegram Mini App hub", () => {
  test("/tg renders and is public (no /login redirect)", async ({ page }) => {
    const res = await page.goto("/tg")
    expect(res?.status()).toBeLessThan(400)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/агенты/i)
  })

  test("/api/tg/chat rejects requests without initData (401)", async ({ request }) => {
    const res = await request.post("/api/tg/chat", {
      data: { tool: "essay", messages: [] },
    })
    expect(res.status()).toBe(401)
  })
})
