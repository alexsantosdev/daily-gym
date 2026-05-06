import { expect, test } from "@playwright/test"

const loggedRoutes = [
  { path: "/calendar", heading: "Calendario" },
  { path: "/workouts", heading: "Treinos" },
  { path: "/meals", heading: "Refeicoes" },
  { path: "/reports", heading: "Relatorios" },
  { path: "/water", heading: "Hidratacao" },
  { path: "/personal-ai", heading: "Personal IA" },
]

test.describe("authenticated shell coverage @e2e @auth", () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_USER_EMAIL
    const password = process.env.E2E_USER_PASSWORD

    if (!email || !password) {
      throw new Error("E2E_USER_EMAIL and E2E_USER_PASSWORD are required in .env.e2e")
    }

    await page.goto("/login")
    await expect(
      page.getByRole("heading", { name: "Entrar no daily-gym" })
    ).toBeVisible()

    await page.getByLabel("E-mail").fill(email)
    await page.getByLabel("Senha").fill(password)
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).toHaveURL(/\/calendar$/, { timeout: 30_000 })
  })

  test("navigates critical logged routes without redirecting to login @smoke @critical", async ({
    page,
  }) => {
    for (const route of loggedRoutes) {
      await test.step(`authenticated route ${route.path}`, async () => {
        await page.goto(route.path)
        await expect(page).toHaveURL(new RegExp(`${route.path.replace("/", "\\/")}$`))
        await expect(page).not.toHaveURL(/\/login$/)
        await expect(
          page.getByRole("heading", { name: route.heading }).first()
        ).toBeVisible()
      })
    }
  })

  test("opens account menu and signs out successfully @regression", async ({
    page,
  }) => {
    await page.goto("/calendar")
    await expect(page).not.toHaveURL(/\/login$/)

    const accountTrigger = page.locator("header button").first()
    await accountTrigger.click()

    await expect(page.getByText("Conectado como")).toBeVisible()
    await expect(page.getByRole("button", { name: "Sair" })).toBeVisible()

    await page.getByRole("button", { name: "Sair" }).click()

    await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 })
    await expect(
      page.getByRole("heading", { name: "Entrar no daily-gym" })
    ).toBeVisible()
  })
})
