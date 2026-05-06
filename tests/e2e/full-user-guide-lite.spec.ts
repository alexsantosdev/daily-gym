import { expect, test, type Locator, type Page } from "@playwright/test"
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"

type ManifestRow = {
  kind: "ui"
  feature: string
  scenarioId: string
  title: string
  role: "anonymous" | "authenticated_user"
  route?: string
  browser: string
  notes?: string[]
  screenshotPublicPath?: string
}

const docsRoot = join("docs", "user-guide")
const evidenceRoot = join(docsRoot, "assets", "evidence")
const artifactsRoot = join("artifacts", "doc-guide")
const manifestPath = join(artifactsRoot, "manifest.jsonl")
const internalScenariosPath = join(artifactsRoot, "internal-scenarios.md")

function slugify(value: string) {
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

async function maskSensitiveContent(page: Page) {
  await page.evaluate(() => {
    const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    const uidRegex = /\bUID:\s*[A-Za-z0-9_-]+\b/gi
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    while (walker.nextNode()) {
      nodes.push(walker.currentNode as Text)
    }
    for (const node of nodes) {
      const text = node.textContent ?? ""
      const masked = text
        .replace(emailRegex, "usuario@exemplo.com")
        .replace(uidRegex, "UID: oculto")
      if (masked !== text) {
        node.textContent = masked
      }
    }
  })
}

async function captureEvidence(page: Page, feature: string, scenario: string, project: string, locator?: Locator) {
  await maskSensitiveContent(page)
  const featureSlug = slugify(feature)
  const fileName = `${project}--${scenario}.png`
  const publicPath = `assets/evidence/${featureSlug}/${fileName}`
  const absolutePath = join(evidenceRoot, featureSlug, fileName)
  mkdirSync(join(evidenceRoot, featureSlug), { recursive: true })

  const target = locator ?? page.locator("main").first()
  if ((await target.count()) > 0) {
    await target.first().screenshot({ path: absolutePath, animations: "disabled" })
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
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/calendar$/, { timeout: 30_000 })
}

async function safeClick(locator: Locator) {
  if ((await locator.count()) > 0) {
    await locator.first().click()
    return true
  }
  return false
}

test.describe.configure({ mode: "serial" })

test.beforeAll(() => {
  mkdirSync(evidenceRoot, { recursive: true })
  mkdirSync(artifactsRoot, { recursive: true })
  writeFileSync(manifestPath, "", "utf8")
  writeFileSync(internalScenariosPath, "# Cenários internos\n\n", "utf8")
})

test("collects complete navigation evidence for user guide", async ({ page }, testInfo) => {
  test.setTimeout(10 * 60 * 1000)
  const browser = testInfo.project.name

  await page.goto("/login")
  appendManifest({
    kind: "ui",
    feature: "Autenticacao",
    scenarioId: "login",
    title: "Tela de login",
    role: "anonymous",
    route: "/login",
    browser,
    notes: ["Campos de e-mail e senha disponíveis para acesso.", "Fluxo de criação de conta acessível pelo botão Criar nova conta."],
    screenshotPublicPath: await captureEvidence(page, "Autenticacao", "login", browser),
  })

  await safeClick(page.getByRole("button", { name: "Criar nova conta" }))
  appendManifest({
    kind: "ui",
    feature: "Autenticacao",
    scenarioId: "register",
    title: "Modo de cadastro",
    role: "anonymous",
    route: "/login",
    browser,
    notes: ["Formulário inclui o campo Nome para abrir nova conta."],
    screenshotPublicPath: await captureEvidence(page, "Autenticacao", "register", browser),
  })

  await page.goto("/calendar")
  await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 })
  appendManifest({
    kind: "ui",
    feature: "Protecao de rotas",
    scenarioId: "redirect",
    title: "Bloqueio de rota protegida",
    role: "anonymous",
    route: "/calendar",
    browser,
    notes: ["Visitantes sem sessão são redirecionados para login."],
    screenshotPublicPath: await captureEvidence(page, "Protecao de rotas", "redirect", browser),
  })

  await login(page)

  const routes: Array<{ feature: string; route: string; title: string; notes: string[]; after?: () => Promise<void> }> = [
    {
      feature: "Calendario",
      route: "/calendar",
      title: "Visão mensal",
      notes: ["A tela reúne calendário, métricas e planejamentos do dia."],
      after: async () => {
        if (await safeClick(page.getByRole("button", { name: "Novo planejamento" }))) {
          appendManifest({
            kind: "ui",
            feature: "Calendario",
            scenarioId: "new-planning-sheet",
            title: "Abertura do formulário de planejamento",
            role: "authenticated_user",
            route: "/calendar",
            browser,
            notes: ["É possível abrir o formulário para criar planejamento por data."],
            screenshotPublicPath: await captureEvidence(page, "Calendario", "new-planning-sheet", browser),
          })
          await page.keyboard.press("Escape")
        }
      },
    },
    {
      feature: "Treinos",
      route: "/workouts",
      title: "Aba Hoje",
      notes: ["Concentra execução do treino e resumo do dia."],
      after: async () => {
        if (await safeClick(page.getByRole("tab", { name: "Planos" }))) {
          appendManifest({
            kind: "ui",
            feature: "Treinos",
            scenarioId: "plans-tab",
            title: "Aba Planos",
            role: "authenticated_user",
            route: "/workouts?tab=plans",
            browser,
            notes: ["Gerenciamento de planos de treino ativos e inativos."],
            screenshotPublicPath: await captureEvidence(page, "Treinos", "plans-tab", browser),
          })
        }
        if (await safeClick(page.getByRole("tab", { name: "Treinos" }))) {
          appendManifest({
            kind: "ui",
            feature: "Treinos",
            scenarioId: "workouts-tab",
            title: "Aba Treinos",
            role: "authenticated_user",
            route: "/workouts?tab=workouts",
            browser,
            notes: ["Cadastro e manutenção dos treinos por plano."],
            screenshotPublicPath: await captureEvidence(page, "Treinos", "workouts-tab", browser),
          })
        }
        if (await safeClick(page.getByRole("tab", { name: "Historico" }))) {
          appendManifest({
            kind: "ui",
            feature: "Treinos",
            scenarioId: "history-tab",
            title: "Aba Histórico",
            role: "authenticated_user",
            route: "/workouts?tab=history",
            browser,
            notes: ["Mostra execuções e atividades registradas no histórico."],
            screenshotPublicPath: await captureEvidence(page, "Treinos", "history-tab", browser),
          })
        }
      },
    },
    {
      feature: "Refeicoes",
      route: "/meals",
      title: "Lista e filtros de refeições",
      notes: ["Tela de registro alimentar com filtros por data e tipo."],
      after: async () => {
        if (await safeClick(page.getByRole("button", { name: "Nova refeicao" }))) {
          appendManifest({
            kind: "ui",
            feature: "Refeicoes",
            scenarioId: "new-meal-sheet",
            title: "Formulário de nova refeição",
            role: "authenticated_user",
            route: "/meals",
            browser,
            notes: ["Fluxo inclui data, horário, tipo, descrição e foto opcional."],
            screenshotPublicPath: await captureEvidence(page, "Refeicoes", "new-meal-sheet", browser),
          })
          await page.keyboard.press("Escape")
        }
      },
    },
    {
      feature: "Atividades",
      route: "/activities",
      title: "Registro de atividades",
      notes: ["Permite cadastrar caminhada, corrida e outras atividades."],
      after: async () => {
        if (await safeClick(page.getByRole("button", { name: "Registrar atividade" }))) {
          appendManifest({
            kind: "ui",
            feature: "Atividades",
            scenarioId: "activity-form",
            title: "Formulário de atividade",
            role: "authenticated_user",
            route: "/activities",
            browser,
            notes: ["Campos de nome, tipo, data, duração, foto e observações."],
            screenshotPublicPath: await captureEvidence(page, "Atividades", "activity-form", browser),
          })
          await safeClick(page.getByRole("button", { name: "Fechar" }))
        }
      },
    },
    {
      feature: "Relatorios",
      route: "/reports",
      title: "Painel de relatórios",
      notes: ["Dashboards por treinos, atividades, refeições e visão geral."],
    },
    {
      feature: "Competicao",
      route: "/groups",
      title: "Grupos de competição",
      notes: ["Fluxos de criar grupo e entrar com código de convite."],
    },
    {
      feature: "Hidratacao",
      route: "/water",
      title: "Controle de consumo de água",
      notes: ["Meta diária, registro rápido e histórico com edição/exclusão."],
      after: async () => {
        if (await safeClick(page.getByRole("button", { name: "Personalizado" }))) {
          appendManifest({
            kind: "ui",
            feature: "Hidratacao",
            scenarioId: "custom-water-sheet",
            title: "Registro personalizado de água",
            role: "authenticated_user",
            route: "/water",
            browser,
            notes: ["Painel para informar quantidade em ml e observações opcionais."],
            screenshotPublicPath: await captureEvidence(page, "Hidratacao", "custom-water-sheet", browser),
          })
          await page.keyboard.press("Escape")
        }
      },
    },
    {
      feature: "Personal IA",
      route: "/personal-ai",
      title: "Recomendações com IA",
      notes: ["Resumo do perfil IA, geração de recomendações e histórico."],
    },
    {
      feature: "Perfil",
      route: "/profile",
      title: "Perfil e evolução",
      notes: ["Dados pessoais, progresso mensal e integração Strava."],
    },
    {
      feature: "Configuracoes",
      route: "/settings",
      title: "Status da conta",
      notes: ["Resumo de conta e integrações disponíveis."],
    },
    {
      feature: "Planejamento",
      route: "/planning",
      title: "Redirecionamento de rota",
      notes: ["A rota /planning redireciona para /calendar."],
    },
    {
      feature: "Planos de treino",
      route: "/workout-plans",
      title: "Tela de apoio de planos",
      notes: ["Cadastro direto de planos com lista e ações de edição/exclusão."],
    },
  ]

  for (const item of routes) {
    await page.goto(item.route)
    await page.waitForTimeout(700)
    appendManifest({
      kind: "ui",
      feature: item.feature,
      scenarioId: `route-${slugify(item.route)}`,
      title: item.title,
      role: "authenticated_user",
      route: item.route,
      browser,
      notes: item.notes,
      screenshotPublicPath: await captureEvidence(page, item.feature, `route-${slugify(item.route)}`, browser),
    })
    if (item.after) {
      await item.after()
    }
  }

  await page.goto("/groups")
  if ((await page.getByRole("button", { name: "Abrir competicao" }).count()) > 0) {
    await page.getByRole("button", { name: "Abrir competicao" }).first().click()
    await page.waitForTimeout(800)
    appendManifest({
      kind: "ui",
      feature: "Competicao",
      scenarioId: "route-group-details",
      title: "Detalhes do grupo",
      role: "authenticated_user",
      route: "/groups/[groupId]",
      browser,
      notes: ["Tela com ranking, feed, filtros por período e fotos recentes."],
      screenshotPublicPath: await captureEvidence(page, "Competicao", "route-group-details", browser),
    })
  }
})
