import { expect, test } from "@playwright/test"

test.use({ storageState: { cookies: [], origins: [] } })

test.describe("auth boundary @e2e @auth", () => {
  test("redirects root visitors to login without a session @smoke @critical", async ({
    page,
  }) => {
    await page.goto("/")

    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole("heading", { name: "Entrar no daily-gym" })
    ).toBeVisible()
  })

  test("renders accessible login controls @smoke @a11y", async ({ page }) => {
    await page.goto("/login")

    await expect(
      page.getByRole("heading", { name: "Entrar no daily-gym" })
    ).toBeVisible()
    await expect(page.getByLabel("E-mail")).toBeVisible()
    await expect(page.getByLabel("Senha")).toBeVisible()
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Criar nova conta" })
    ).toBeVisible()
  })

  test("switches between login and registration modes @regression", async ({
    page,
  }) => {
    await page.goto("/login")

    await page.getByRole("button", { name: "Criar nova conta" }).click()

    await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible()
    await expect(page.getByLabel("Nome")).toBeVisible()
    await expect(page.getByRole("button", { name: "Criar conta" })).toBeVisible()

    await page.getByRole("button", { name: /tenho conta/i }).click()

    await expect(
      page.getByRole("heading", { name: "Entrar no daily-gym" })
    ).toBeVisible()
    await expect(page.getByLabel("Nome")).toHaveCount(0)
  })

  test("protects authenticated routes from anonymous visitors @critical", async ({
    page,
  }) => {
    await page.goto("/calendar")

    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole("heading", { name: "Entrar no daily-gym" })
    ).toBeVisible()
  })
})
