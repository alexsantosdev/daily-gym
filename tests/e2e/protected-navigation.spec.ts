import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

const protectedRoutes = [
  "/activities",
  "/calendar",
  "/groups",
  "/groups/test-group",
  "/meals",
  "/personal-ai",
  "/planning",
  "/profile",
  "/reports",
  "/settings",
  "/water",
  "/workout-plans",
  "/workouts",
]

test.describe("anonymous navigation boundaries @e2e @auth", () => {
  test("redirects anonymous users from protected routes @critical @regression", async ({
    page,
  }) => {
    for (const route of protectedRoutes) {
      await test.step(`anonymous user hits ${route}`, async () => {
        await page.goto(route, { waitUntil: "domcontentloaded", timeout: 45_000 })

        await expect(async () => {
          if (page.url().endsWith("/login")) {
            await expect(
              page.getByRole("heading", { name: "Entrar no daily-gym" })
            ).toBeVisible()
            return
          }

          await expect(page.getByText("Carregando sua área...")).toBeVisible()
        }).toPass({ timeout: 10_000 })
      })
    }
  })

  test("keeps auth form constraints consistent between login and register @smoke @a11y", async ({
    page,
  }) => {
    await page.goto("/login")

    await expect(page.getByLabel("E-mail")).toHaveAttribute("type", "email")
    await expect(page.getByLabel("E-mail")).toHaveAttribute("autocomplete", "email")
    await expect(page.getByLabel("Senha")).toHaveAttribute("autocomplete", "current-password")
    await expect(page.getByLabel("Senha")).toHaveAttribute("minlength", "6")

    const loginValidityBeforeFill = await page
      .locator("form")
      .evaluate((form) => (form as HTMLFormElement).checkValidity())
    expect(loginValidityBeforeFill).toBe(false)

    await page.getByLabel("E-mail").fill("user@example.com")
    await page.getByLabel("Senha").fill("123456")

    const loginValidityAfterFill = await page
      .locator("form")
      .evaluate((form) => (form as HTMLFormElement).checkValidity())
    expect(loginValidityAfterFill).toBe(true)

    await page.getByRole("button", { name: "Criar nova conta" }).click()

    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible()
    await expect(page.getByLabel("Nome")).toBeVisible()
    await expect(page.getByLabel("Senha")).toHaveAttribute("autocomplete", "new-password")

    await page.getByLabel("E-mail").fill("new-user@example.com")
    await page.getByLabel("Senha").fill("123456")

    const registerValidityWithoutName = await page
      .locator("form")
      .evaluate((form) => (form as HTMLFormElement).checkValidity())
    expect(registerValidityWithoutName).toBe(false)

    await page.getByLabel("Nome").fill("Novo Usuario")

    const registerValidityWithName = await page
      .locator("form")
      .evaluate((form) => (form as HTMLFormElement).checkValidity())
    expect(registerValidityWithName).toBe(true)
  })
})
