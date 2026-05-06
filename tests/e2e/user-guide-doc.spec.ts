import { expect, test, type Page } from "@playwright/test"
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

type ManifestRow = {
  kind: "ui" | "api"
  feature: string
  scenarioId: string
  title: string
  role: "anonymous" | "authenticated_user"
  route?: string
  browser: string
  notes?: string[]
  screenshotPublicPath?: string
  apiSnippetPath?: string
}

const outputRoot = "generated-user-guide"
const evidenceRoot = join(outputRoot, "assets", "evidence")
const artifactsRoot = join(outputRoot, "artifacts", "doc-guide")
const apiSnippetsRoot = join(artifactsRoot, "api-snippets")
const manifestPath = join(artifactsRoot, "manifest.jsonl")

const loggedRoutes = [
  { path: "/calendar", heading: "Calendario" },
  { path: "/workouts", heading: "Treinos" },
  { path: "/meals", heading: "Refeicoes" },
  { path: "/reports", heading: "Relatorios" },
  { path: "/groups", heading: "Competicao" },
  { path: "/water", heading: "Hidratacao" },
  { path: "/personal-ai", heading: "Personal IA" },
] as const

function sanitizeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function appendManifest(row: ManifestRow) {
  appendFileSync(manifestPath, `${JSON.stringify(row)}\n`, "utf8")
}

async function captureMainScreenshot(page: Page, featureSlug: string, scenarioId: string, project: string) {
  const fileName = `${project}--${scenarioId}.png`
  const publicPath = `../../assets/evidence/${featureSlug}/${fileName}`
  const absolutePath = join(evidenceRoot, featureSlug, fileName)
  mkdirSync(join(evidenceRoot, featureSlug), { recursive: true })

  const main = page.locator("main")
  if ((await main.count()) > 0) {
    await main.first().screenshot({ path: absolutePath, animations: "disabled" })
  } else {
    await page.screenshot({ path: absolutePath, fullPage: false, animations: "disabled" })
  }

  return publicPath
}

async function login(page: Page) {
  const email = process.env.E2E_USER_EMAIL
  const password = process.env.E2E_USER_PASSWORD
  if (!email || !password) {
    throw new Error("Credenciais E2E ausentes em .env.e2e")
  }

  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Entrar no daily-gym" })).toBeVisible()
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/calendar$/, { timeout: 30_000 })
}

test.describe.configure({ mode: "serial" })

test.beforeAll(() => {
  mkdirSync(evidenceRoot, { recursive: true })
  mkdirSync(apiSnippetsRoot, { recursive: true })
  writeFileSync(manifestPath, "", "utf8")
})

test("collects publishable evidence for user guide", async ({ page }, testInfo) => {
  const browser = testInfo.project.name

  await page.goto("/login")
  await expect(page.getByRole("heading", { name: "Entrar no daily-gym" })).toBeVisible()

  const authFeature = "Autenticacao"
  const authFeatureSlug = sanitizeSlug(authFeature)
  const loginScenario = "login-view"
  const loginScreenshot = await captureMainScreenshot(page, authFeatureSlug, loginScenario, browser)
  appendManifest({
    kind: "ui",
    feature: authFeature,
    scenarioId: loginScenario,
    title: "Tela de entrada e campos obrigatorios",
    role: "anonymous",
    route: "/login",
    browser,
    notes: ["Campos observados: E-mail, Senha, botoes de entrar e criar conta."],
    screenshotPublicPath: loginScreenshot,
  })

  await page.getByRole("button", { name: "Criar nova conta" }).click()
  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible()
  const registerScenario = "register-toggle"
  const registerScreenshot = await captureMainScreenshot(
    page,
    authFeatureSlug,
    registerScenario,
    browser
  )
  appendManifest({
    kind: "ui",
    feature: authFeature,
    scenarioId: registerScenario,
    title: "Alternancia para modo de cadastro",
    role: "anonymous",
    route: "/login",
    browser,
    notes: ["Modo de cadastro exibiu campo Nome e acao de criar conta."],
    screenshotPublicPath: registerScreenshot,
  })

  await page.goto("/calendar")
  await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 })
  const guardFeature = "Protecao de rotas"
  const guardFeatureSlug = sanitizeSlug(guardFeature)
  const guardScenario = "anonymous-redirect-calendar"
  const guardScreenshot = await captureMainScreenshot(page, guardFeatureSlug, guardScenario, browser)
  appendManifest({
    kind: "ui",
    feature: guardFeature,
    scenarioId: guardScenario,
    title: "Redirecionamento de visitante para login",
    role: "anonymous",
    route: "/calendar",
    browser,
    notes: ["Visitante sem sessao foi enviado para /login ao abrir rota protegida."],
    screenshotPublicPath: guardScreenshot,
  })

  await login(page)

  const navFeature = "Navegacao autenticada"
  const navFeatureSlug = sanitizeSlug(navFeature)
  for (const route of loggedRoutes) {
    await page.goto(route.path)
    await expect(page).toHaveURL(new RegExp(`${route.path.replace("/", "\\/")}$`))
    await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible()

    const scenarioId = `auth-route-${sanitizeSlug(route.path)}`
    const screenshotPath = await captureMainScreenshot(page, navFeatureSlug, scenarioId, browser)
    appendManifest({
      kind: "ui",
      feature: navFeature,
      scenarioId,
      title: `Acesso autenticado a ${route.path}`,
      role: "authenticated_user",
      route: route.path,
      browser,
      notes: ["Rota carregou sem redirecionar para login."],
      screenshotPublicPath: screenshotPath,
    })
  }

  const stravaConfigResponse = await page.request.get("/api/strava/config")
  const apiScenarioId = "api-strava-config-get"
  const apiFeature = "Configuracao de integracao Strava"
  const apiFeatureSlug = sanitizeSlug(apiFeature)
  const apiSnippetRelPath = `artifacts/doc-guide/api-snippets/${apiScenarioId}.json`
  const apiSnippetAbsPath = join(apiSnippetsRoot, `${apiScenarioId}.json`)
  let apiPayloadKeys: string[] = []
  try {
    const apiPayload = (await stravaConfigResponse.json()) as Record<string, unknown>
    apiPayloadKeys = Object.keys(apiPayload)
  } catch {
    apiPayloadKeys = []
  }

  const sanitizedApiSnippet = {
    method: "GET",
    route: "/api/strava/config",
    status: stravaConfigResponse.status(),
    bodyShape: apiPayloadKeys,
  }
  writeFileSync(apiSnippetAbsPath, JSON.stringify(sanitizedApiSnippet, null, 2), "utf8")

  const apiScreenshot = await captureMainScreenshot(page, apiFeatureSlug, apiScenarioId, browser)
  appendManifest({
    kind: "api",
    feature: apiFeature,
    scenarioId: apiScenarioId,
    title: "Consulta autenticada da configuracao de integracao",
    role: "authenticated_user",
    route: "/profile",
    browser,
    notes: ["Resposta registrada com status e estrutura de chaves do payload."],
    screenshotPublicPath: apiScreenshot,
    apiSnippetPath: apiSnippetRelPath,
  })
})
