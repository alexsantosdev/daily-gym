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
    const tokenRegex = /\b[A-Za-z0-9_-]{24,}\b/g

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    while (walker.nextNode()) {
      nodes.push(walker.currentNode as Text)
    }

    for (const node of nodes) {
      const original = node.textContent ?? ""
      const masked = original
        .replace(emailRegex, "usuario@exemplo.com")
        .replace(uidRegex, "UID: oculto")
        .replace(tokenRegex, (value) => (value.includes("@") ? value : "oculto"))
      if (masked !== original) {
        node.textContent = masked
      }
    }
  })
}

async function captureEvidence(
  page: Page,
  feature: string,
  scenarioId: string,
  project: string,
  locator?: Locator
) {
  await maskSensitiveContent(page)
  const featureSlug = slugify(feature)
  const fileName = `${project}--${scenarioId}.png`
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
  await expect(page.getByRole("heading", { name: "Entrar no daily-gym" })).toBeVisible()
  await page.getByLabel("E-mail").fill(email)
  await page.getByLabel("Senha").fill(password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await expect(page).toHaveURL(/\/calendar$/, { timeout: 30_000 })
}

async function checkFormValidity(form: Locator) {
  return form.evaluate((node) => (node as HTMLFormElement).checkValidity())
}

test.describe.configure({ mode: "serial" })

test.beforeAll(() => {
  mkdirSync(evidenceRoot, { recursive: true })
  mkdirSync(artifactsRoot, { recursive: true })
  writeFileSync(manifestPath, "", "utf8")
  writeFileSync(internalScenariosPath, "# Cenários internos\n\n", "utf8")
})

test("collects full app documentation evidence", async ({ page }, testInfo) => {
  test.setTimeout(20 * 60 * 1000)
  const browser = testInfo.project.name
  const runId = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14)

  await page.goto("/login")
  const loginShot = await captureEvidence(page, "Autenticacao", "login-view", browser)
  appendManifest({
    kind: "ui",
    feature: "Autenticacao",
    scenarioId: "login-view",
    title: "Tela de entrada da conta",
    role: "anonymous",
    route: "/login",
    browser,
    notes: [
      "A tela principal apresenta os campos E-mail e Senha e o botão Entrar.",
      "O botão Criar nova conta alterna para o formulário de cadastro.",
      "A senha exige ao menos 6 caracteres para envio válido.",
    ],
    screenshotPublicPath: loginShot,
  })

  await page.getByRole("button", { name: "Criar nova conta" }).click()
  await expect(page.getByRole("heading", { name: "Criar conta" })).toBeVisible()
  const registerShot = await captureEvidence(page, "Autenticacao", "register-mode", browser)
  const registerValid = await checkFormValidity(page.locator("form").first())
  appendManifest({
    kind: "ui",
    feature: "Autenticacao",
    scenarioId: "register-mode",
    title: "Modo de criação de conta",
    role: "anonymous",
    route: "/login",
    browser,
    notes: [
      "No cadastro, o campo Nome aparece além de E-mail e Senha.",
      `Sem preencher todos os campos, o formulário fica inválido: ${String(!registerValid)}.`,
      "Use Já tenho conta para voltar ao modo de entrada sem perder o contexto da tela.",
    ],
    screenshotPublicPath: registerShot,
  })

  await page.goto("/calendar")
  await expect(page).toHaveURL(/\/login$/, { timeout: 20_000 })
  const protectedShot = await captureEvidence(page, "Protecao de rotas", "redirect-calendar", browser)
  appendManifest({
    kind: "ui",
    feature: "Protecao de rotas",
    scenarioId: "redirect-calendar",
    title: "Redirecionamento de visitante",
    role: "anonymous",
    route: "/calendar",
    browser,
    notes: [
      "Ao tentar abrir área protegida sem sessão ativa, a aplicação volta para a tela de login.",
      "Esse comportamento evita acesso a dados privados fora da autenticação.",
    ],
    screenshotPublicPath: protectedShot,
  })

  await login(page)

  await page.goto("/planning")
  await expect(page).toHaveURL(/\/calendar$/, { timeout: 15_000 })
  const planningRedirectShot = await captureEvidence(
    page,
    "Calendario e planejamento",
    "planning-route-redirect",
    browser
  )
  appendManifest({
    kind: "ui",
    feature: "Calendario e planejamento",
    scenarioId: "planning-route-redirect",
    title: "Rota de planejamento redireciona para Calendário",
    role: "authenticated_user",
    route: "/planning",
    browser,
    notes: [
      "A rota /planning leva para o Calendário, centralizando o planejamento diário em uma única tela.",
    ],
    screenshotPublicPath: planningRedirectShot,
  })

  await page.goto("/calendar")
  const calendarShot = await captureEvidence(page, "Calendario e planejamento", "calendar-overview", browser)
  appendManifest({
    kind: "ui",
    feature: "Calendario e planejamento",
    scenarioId: "calendar-overview",
    title: "Visão mensal do calendário",
    role: "authenticated_user",
    route: "/calendar",
    browser,
    notes: [
      "A tela mostra visão mensal com resumo por dia de refeições, treinos, atividades e planejamentos.",
      "Também apresenta cartões de indicadores e atalhos para criação de novo planejamento.",
    ],
    screenshotPublicPath: calendarShot,
  })

  await page.getByRole("button", { name: "Novo planejamento" }).first().click()
  await expect(page.getByLabel("Titulo")).toBeVisible()
  const planningFormShot = await captureEvidence(
    page,
    "Calendario e planejamento",
    "planning-form-open",
    browser
  )

  const planningForm = page.locator("form").first()
  const planningValidWithoutTitle = await checkFormValidity(planningForm)
  const planningName = `Planejamento guia ${runId}`
  await page.getByLabel("Titulo").fill(planningName)
  await page.getByLabel("Observacoes").fill("Criado para documentação do fluxo.")
  await page.getByRole("button", { name: "Criar planejamento" }).click()
  await expect(page.getByLabel("Titulo")).toHaveCount(0, { timeout: 15_000 })

  appendManifest({
    kind: "ui",
    feature: "Calendario e planejamento",
    scenarioId: "planning-form-validation-and-create",
    title: "Criação de planejamento do dia",
    role: "authenticated_user",
    route: "/calendar",
    browser,
    notes: [
      `Sem título, o formulário não é válido: ${String(!planningValidWithoutTitle)}.`,
      "Após preencher Título e manter data/horário, o registro é criado no dia selecionado.",
      "Use os botões Concluir, Ignorar, Editar e Excluir para gerenciar cada item planejado.",
    ],
    screenshotPublicPath: planningFormShot,
  })

  const planningCard = page.locator("div").filter({ hasText: planningName }).first()
  await expect(planningCard).toBeVisible()
  const planningCreatedShot = await captureEvidence(
    page,
    "Calendario e planejamento",
    "planning-card-created",
    browser
  )
  appendManifest({
    kind: "ui",
    feature: "Calendario e planejamento",
    scenarioId: "planning-card-created",
    title: "Planejamento criado e visível no dia",
    role: "authenticated_user",
    route: "/calendar",
    browser,
    notes: [
      "Depois da criação, o card aparece em Planejamentos do dia com horário e status.",
      "A partir do card, é possível iniciar ação rápida para refeições, atividades ou treino.",
    ],
    screenshotPublicPath: planningCreatedShot,
  })

  await planningCard.getByRole("button", { name: "Concluir" }).first().click()
  const planningDoneShot = await captureEvidence(
    page,
    "Calendario e planejamento",
    "planning-mark-completed",
    browser
  )
  appendManifest({
    kind: "ui",
    feature: "Calendario e planejamento",
    scenarioId: "planning-mark-completed",
    title: "Marcação de item como concluído",
    role: "authenticated_user",
    route: "/calendar",
    browser,
    notes: [
      "Ao concluir, o status do planejamento muda no próprio card.",
      "Esse status ajuda a acompanhar aderência da rotina planejada.",
    ],
    screenshotPublicPath: planningDoneShot,
  })

  await planningCard.getByRole("button", { name: "Excluir" }).first().click()
  await page.waitForTimeout(600)

  await page.goto("/workouts")
  const workoutsTodayShot = await captureEvidence(page, "Treinos", "workouts-today-tab", browser)
  appendManifest({
    kind: "ui",
    feature: "Treinos",
    scenarioId: "workouts-today-tab",
    title: "Tela Treinos na aba Hoje",
    role: "authenticated_user",
    route: "/workouts",
    browser,
    notes: [
      "A aba Hoje reúne o treino do dia, plano ativo e botão para iniciar execução em tela cheia.",
      "Se já houver treino no dia, o botão muda para Treinar novamente.",
    ],
    screenshotPublicPath: workoutsTodayShot,
  })

  await page.getByRole("tab", { name: "Planos" }).click()
  await page.getByRole("button", { name: "Novo plano" }).click()
  const planFormShot = await captureEvidence(page, "Treinos", "workout-plan-form", browser)

  const planName = `Plano guia ${runId}`
  await page.getByLabel("Nome do plano").fill(planName)
  await page.getByRole("button", { name: /^Seg|Ter|Qua|Qui|Sex|Sab|Dom/ }).first().click()
  await page.getByRole("button", { name: "Criar plano" }).click()
  await expect(page.getByText(planName)).toBeVisible({ timeout: 15_000 })

  appendManifest({
    kind: "ui",
    feature: "Treinos",
    scenarioId: "workout-plan-create",
    title: "Cadastro de plano de treino",
    role: "authenticated_user",
    route: "/workouts?tab=plans",
    browser,
    notes: [
      "Na aba Planos, use Novo plano para cadastrar nome, objetivo, dias e status.",
      "A lista de planos permite editar e excluir cada item.",
      "Os dias marcados definem a lógica de planejamento semanal.",
    ],
    screenshotPublicPath: planFormShot,
  })

  await page.getByRole("tab", { name: "Treinos" }).click()
  await page.getByRole("button", { name: "Novo treino" }).click()
  const workoutFormShot = await captureEvidence(page, "Treinos", "workout-form-open", browser)

  const workoutName = `Treino guia ${runId}`
  await page.getByLabel("Plano").selectOption({ label: planName })
  await page.getByLabel("Nome do treino").fill(workoutName)
  await page.getByLabel("Grupo muscular").fill("Peito")
  await page.getByLabel("Ordem").fill("1")
  await page
    .getByLabel("Exercicios (1 linha por exercicio)")
    .fill("Supino reto|Peito|4|10|40kg|Controle na descida")
  await page.getByRole("button", { name: "Criar treino" }).click()
  await expect(page.getByText(workoutName)).toBeVisible({ timeout: 15_000 })

  appendManifest({
    kind: "ui",
    feature: "Treinos",
    scenarioId: "workout-create",
    title: "Cadastro de treino vinculado a plano",
    role: "authenticated_user",
    route: "/workouts?tab=workouts",
    browser,
    notes: [
      "Na aba Treinos, cadastre nome, grupo muscular, dia da semana, ordem e lista de exercícios.",
      "Cada exercício aceita formato em linha (nome|grupo|séries|reps|carga|observações).",
      "Após salvar, o card mostra ações de edição e exclusão.",
    ],
    screenshotPublicPath: workoutFormShot,
  })

  await page.getByRole("tab", { name: "Hoje" }).click()
  await page.getByRole("button", { name: /Iniciar treino|Treinar novamente/ }).click()
  const executionSheetShot = await captureEvidence(page, "Treinos", "execution-sheet-open", browser)
  await page.getByRole("button", { name: /^Iniciar treino/ }).first().click()
  await page.getByRole("button", { name: "Marcar como executado" }).click()
  await expect(page.getByText("Resumo do treino executado")).toBeVisible({ timeout: 20_000 })
  const executionSummaryShot = await captureEvidence(page, "Treinos", "execution-summary", browser)
  await page.getByRole("button", { name: "Fechar resumo" }).click()
  await page.keyboard.press("Escape")

  appendManifest({
    kind: "ui",
    feature: "Treinos",
    scenarioId: "execution-flow",
    title: "Execução de treino em tela cheia",
    role: "authenticated_user",
    route: "/workouts?start=1",
    browser,
    notes: [
      "O fluxo de execução permite iniciar treino, marcar exercícios e finalizar com resumo.",
      "Há progresso visual por exercício e registro de status (planejado, em andamento, executado).",
    ],
    screenshotPublicPath: executionSheetShot,
  })
  appendManifest({
    kind: "ui",
    feature: "Treinos",
    scenarioId: "execution-summary",
    title: "Resumo final da execução",
    role: "authenticated_user",
    route: "/workouts",
    browser,
    notes: [
      "No fim do treino, o resumo mostra duração, exercícios concluídos e detalhes de carga/repetição.",
      "Esse resumo ajuda na revisão do treino antes de seguir para o histórico.",
    ],
    screenshotPublicPath: executionSummaryShot,
  })

  await page.getByRole("tab", { name: "Treinos" }).click()
  const workoutCard = page.locator("div").filter({ hasText: workoutName }).first()
  if ((await workoutCard.count()) > 0) {
    await workoutCard.getByRole("button", { name: "Excluir" }).click()
  }
  await page.getByRole("tab", { name: "Planos" }).click()
  const planCard = page.locator("div").filter({ hasText: planName }).first()
  if ((await planCard.count()) > 0) {
    await planCard.getByRole("button", { name: "Excluir" }).click()
  }

  await page.goto("/meals")
  const mealsShot = await captureEvidence(page, "Refeicoes", "meals-overview", browser)
  appendManifest({
    kind: "ui",
    feature: "Refeicoes",
    scenarioId: "meals-overview",
    title: "Tela de refeições com filtros",
    role: "authenticated_user",
    route: "/meals",
    browser,
    notes: [
      "A tela reúne estatísticas do período, filtros por data/tipo e lista de registros.",
      "A ação Nova refeição abre formulário em painel para cadastro rápido.",
    ],
    screenshotPublicPath: mealsShot,
  })

  await page.getByRole("button", { name: "Nova refeicao" }).click()
  const mealFormShot = await captureEvidence(page, "Refeicoes", "meal-form-open", browser)
  const mealForm = page.locator("form").first()
  const mealValidEmpty = await checkFormValidity(mealForm)
  const mealDescription = `Prato guia ${runId}`
  await page.getByLabel("Descricao").fill(mealDescription)
  await page.getByRole("button", { name: /Registrar refeicao|Salvar rapido/ }).click()
  await page.waitForTimeout(900)
  const mealRow = page.locator("tr").filter({ hasText: mealDescription }).first()
  await expect(mealRow).toBeVisible({ timeout: 20_000 })
  const mealCreatedShot = await captureEvidence(page, "Refeicoes", "meal-created", browser)

  appendManifest({
    kind: "ui",
    feature: "Refeicoes",
    scenarioId: "meal-create-and-validate",
    title: "Cadastro de refeição",
    role: "authenticated_user",
    route: "/meals",
    browser,
    notes: [
      `Com descrição vazia, o formulário não é válido: ${String(!mealValidEmpty)}.`,
      "Após preencher os campos essenciais, o registro aparece na listagem.",
      "Cada refeição permite edição e exclusão para manter o histórico limpo.",
    ],
    screenshotPublicPath: mealFormShot,
  })
  appendManifest({
    kind: "ui",
    feature: "Refeicoes",
    scenarioId: "meal-created",
    title: "Refeição registrada na tabela",
    role: "authenticated_user",
    route: "/meals",
    browser,
    notes: ["A linha criada confirma data, tipo e descrição salvos corretamente."],
    screenshotPublicPath: mealCreatedShot,
  })

  await mealRow.getByRole("button", { name: "Excluir" }).click()
  await page.waitForTimeout(600)

  await page.goto("/activities")
  const activitiesShot = await captureEvidence(page, "Atividades", "activities-overview", browser)
  appendManifest({
    kind: "ui",
    feature: "Atividades",
    scenarioId: "activities-overview",
    title: "Tela de atividades físicas",
    role: "authenticated_user",
    route: "/activities",
    browser,
    notes: [
      "A seção Registro rápido concentra criação, edição e exclusão de atividades.",
      "A lista de atividades recentes facilita revisar e corrigir lançamentos do dia.",
    ],
    screenshotPublicPath: activitiesShot,
  })

  await page.getByRole("button", { name: "Registrar atividade" }).click()
  const activityFormShot = await captureEvidence(page, "Atividades", "activity-form-open", browser)
  const activityForm = page.locator("form").first()
  const activityValidEmpty = await checkFormValidity(activityForm)
  const activityName = `Caminhada guia ${runId}`
  await page.getByLabel("Nome da atividade").fill(activityName)
  await page.getByLabel("Duracao (minutos)").fill("25")
  await page.getByRole("button", { name: "Registrar atividade" }).click()
  await expect(page.getByText(activityName)).toBeVisible({ timeout: 20_000 })
  const activityCreatedShot = await captureEvidence(page, "Atividades", "activity-created", browser)

  appendManifest({
    kind: "ui",
    feature: "Atividades",
    scenarioId: "activity-create-and-validate",
    title: "Cadastro de atividade",
    role: "authenticated_user",
    route: "/activities",
    browser,
    notes: [
      `Sem nome, o formulário não é válido: ${String(!activityValidEmpty)}.`,
      "Com nome, tipo e data preenchidos, a atividade é registrada na lista recente.",
      "Ações de lápis e lixeira permitem atualizar ou remover o item.",
    ],
    screenshotPublicPath: activityFormShot,
  })
  appendManifest({
    kind: "ui",
    feature: "Atividades",
    scenarioId: "activity-created",
    title: "Atividade incluída no histórico recente",
    role: "authenticated_user",
    route: "/activities",
    browser,
    notes: ["A confirmação visual ocorre no card da atividade com data e duração."],
    screenshotPublicPath: activityCreatedShot,
  })

  const activityCard = page.locator("div").filter({ hasText: activityName }).first()
  if ((await activityCard.count()) > 0) {
    await activityCard.locator("button").nth(1).click()
  }

  await page.goto("/water")
  const waterShot = await captureEvidence(page, "Hidratacao", "water-overview", browser)
  appendManifest({
    kind: "ui",
    feature: "Hidratacao",
    scenarioId: "water-overview",
    title: "Painel de hidratação",
    role: "authenticated_user",
    route: "/water",
    browser,
    notes: [
      "A tela exibe meta diária, progresso, atalhos de registro e histórico de consumo.",
      "Também oferece ajustes de alerta de hidratação e resumo dos últimos 14 dias.",
    ],
    screenshotPublicPath: waterShot,
  })

  await page.getByRole("button", { name: "Personalizado" }).click()
  await expect(page.getByText("Registrar agua")).toBeVisible()
  const waterSheetShot = await captureEvidence(page, "Hidratacao", "water-custom-sheet", browser)
  const waterNote = `registro-guia-${runId}`
  await page.getByPlaceholder("Quantidade em ml").fill("180")
  await page.getByPlaceholder("Notas (opcional)").fill(waterNote)
  await page.getByRole("button", { name: "Registrar consumo" }).click()
  await expect(page.getByText(waterNote)).toBeVisible({ timeout: 20_000 })
  const waterCreatedShot = await captureEvidence(page, "Hidratacao", "water-log-created", browser)
  appendManifest({
    kind: "ui",
    feature: "Hidratacao",
    scenarioId: "water-log-create",
    title: "Registro manual de consumo de água",
    role: "authenticated_user",
    route: "/water",
    browser,
    notes: [
      "A opção Personalizado abre painel para quantidade em ml e notas.",
      "Após salvar, o consumo aparece em Registros do dia com horário e origem.",
    ],
    screenshotPublicPath: waterSheetShot,
  })
  appendManifest({
    kind: "ui",
    feature: "Hidratacao",
    scenarioId: "water-log-created",
    title: "Consumo registrado no histórico diário",
    role: "authenticated_user",
    route: "/water",
    browser,
    notes: [
      "O histórico permite editar ou excluir registros individuais para corrigir valores lançados.",
    ],
    screenshotPublicPath: waterCreatedShot,
  })

  const waterLogRow = page.locator("div").filter({ hasText: waterNote }).first()
  if ((await waterLogRow.count()) > 0) {
    await waterLogRow.locator("button").nth(1).click()
  }

  await page.goto("/reports")
  await page.waitForTimeout(1200)
  const reportsShot = await captureEvidence(page, "Relatorios", "reports-overview", browser)
  appendManifest({
    kind: "ui",
    feature: "Relatorios",
    scenarioId: "reports-overview",
    title: "Tela de relatórios com filtros e gráficos",
    role: "authenticated_user",
    route: "/reports",
    browser,
    notes: [
      "A tela combina filtros por período/tipo, gráficos por abas e resumo textual.",
      "As abas Treinos, Atividades, Refeições e Geral mudam os indicadores exibidos.",
    ],
    screenshotPublicPath: reportsShot,
  })

  await page.getByRole("button", { name: "Aplicar filtros" }).click()
  await page.waitForTimeout(1000)
  const reportAiButton = page.getByRole("button", { name: "Gerar analise com IA" })
  if ((await reportAiButton.count()) > 0) {
    await reportAiButton.click()
    await page.waitForTimeout(2000)
  }
  const reportsAiShot = await captureEvidence(page, "Relatorios", "reports-ai-analysis", browser)
  appendManifest({
    kind: "ui",
    feature: "Relatorios",
    scenarioId: "reports-ai-analysis",
    title: "Geração de análise com IA e salvamento",
    role: "authenticated_user",
    route: "/reports",
    browser,
    notes: [
      "Após aplicar filtros, a análise IA pode ser gerada para o período atual.",
      "O botão Salvar relatório adiciona o resultado na seção Relatórios salvos.",
    ],
    screenshotPublicPath: reportsAiShot,
  })

  await page.goto("/groups")
  const groupsShot = await captureEvidence(page, "Competicao", "groups-overview", browser)
  appendManifest({
    kind: "ui",
    feature: "Competicao",
    scenarioId: "groups-overview",
    title: "Tela de grupos de competição",
    role: "authenticated_user",
    route: "/groups",
    browser,
    notes: [
      "A tela oferece dois fluxos: criar grupo e entrar com código de convite.",
      "Também mostra cards dos grupos já participados com botão Abrir competição.",
    ],
    screenshotPublicPath: groupsShot,
  })

  await page.getByRole("button", { name: "Entrar no grupo" }).click()
  const groupJoinError = page.getByText("Informe o codigo de convite.")
  await expect(groupJoinError).toBeVisible()
  const groupValidationShot = await captureEvidence(
    page,
    "Competicao",
    "group-join-validation",
    browser
  )
  appendManifest({
    kind: "ui",
    feature: "Competicao",
    scenarioId: "group-join-validation",
    title: "Validação de código para entrar em grupo",
    role: "authenticated_user",
    route: "/groups",
    browser,
    notes: [
      "Ao enviar sem código, o formulário mostra mensagem para preenchimento obrigatório.",
    ],
    screenshotPublicPath: groupValidationShot,
  })

  if ((await page.getByRole("button", { name: "Abrir competicao" }).count()) === 0) {
    const groupName = `Grupo guia ${runId}`
    await page.getByLabel("Nome do grupo").fill(groupName)
    await page.getByRole("button", { name: "Criar grupo" }).click()
    await expect(page.getByText(groupName)).toBeVisible({ timeout: 20_000 })
  }

  await page.getByRole("button", { name: "Abrir competicao" }).first().click()
  await expect(page).toHaveURL(/\/groups\/.+$/, { timeout: 20_000 })
  const groupDetailsShot = await captureEvidence(page, "Competicao", "group-details", browser)
  appendManifest({
    kind: "ui",
    feature: "Competicao",
    scenarioId: "group-details",
    title: "Detalhes da competição do grupo",
    role: "authenticated_user",
    route: "/groups/[groupId]",
    browser,
    notes: [
      "Nos detalhes, há ranking, feed, fotos recentes e filtros por período/membro.",
      "O código do grupo pode ser copiado para convidar novos participantes.",
    ],
    screenshotPublicPath: groupDetailsShot,
  })

  await page.goto("/profile")
  const profileShot = await captureEvidence(page, "Perfil", "profile-overview", browser)
  appendManifest({
    kind: "ui",
    feature: "Perfil",
    scenarioId: "profile-overview",
    title: "Tela de perfil e evolução",
    role: "authenticated_user",
    route: "/profile",
    browser,
    notes: [
      "A tela reúne dados físicos, objetivo, evolução mensal e integração com Strava.",
      "Também é o local para ativar o consentimento de recomendações com IA.",
    ],
    screenshotPublicPath: profileShot,
  })

  const stravaButton = page.getByRole("button", { name: /Conectar Strava|Gerenciar importacao/ })
  if ((await stravaButton.count()) > 0) {
    await stravaButton.first().click()
    await page.waitForTimeout(600)
    const profileStravaShot = await captureEvidence(page, "Perfil", "profile-strava-modal", browser)
    appendManifest({
      kind: "ui",
      feature: "Perfil",
      scenarioId: "profile-strava-modal",
      title: "Modal de integração com Strava",
      role: "authenticated_user",
      route: "/profile",
      browser,
      notes: [
        "No modal é possível iniciar conexão, importar corridas/caminhadas e desconectar quando disponível.",
        "Em ambiente sem credencial externa, o próprio modal informa o erro de configuração.",
      ],
      screenshotPublicPath: profileStravaShot,
    })
    await page.keyboard.press("Escape")
  }

  await page.goto("/personal-ai")
  const personalAiShot = await captureEvidence(page, "Personal IA", "personal-ai-overview", browser)
  appendManifest({
    kind: "ui",
    feature: "Personal IA",
    scenarioId: "personal-ai-overview",
    title: "Painel de recomendações da IA",
    role: "authenticated_user",
    route: "/personal-ai",
    browser,
    notes: [
      "A tela exibe resumo do perfil, ações para gerar recomendações e histórico das recomendações anteriores.",
      "Sem consentimento ativo, os botões de geração ficam desabilitados até ajuste no Perfil.",
    ],
    screenshotPublicPath: personalAiShot,
  })

  const chatPrompt = page.getByLabel("Contexto extra (opcional)")
  if ((await chatPrompt.count()) > 0) {
    await chatPrompt.fill("Quero sugestões curtas para dias com pouco tempo.")
    const chatButton = page.getByRole("button", { name: /Gerar/ }).last()
    if (await chatButton.isEnabled()) {
      await chatButton.click()
      await page.waitForTimeout(1500)
    }
    const personalAiChatShot = await captureEvidence(page, "Personal IA", "personal-ai-chat", browser)
    appendManifest({
      kind: "ui",
      feature: "Personal IA",
      scenarioId: "personal-ai-chat",
      title: "Solicitação de recomendação personalizada",
      role: "authenticated_user",
      route: "/personal-ai",
      browser,
      notes: [
        "No card Conversar com Personal IA, você escolhe tipo de recomendação e descreve contexto adicional.",
        "A resposta mais recente aparece no próprio histórico da tela.",
      ],
      screenshotPublicPath: personalAiChatShot,
    })
  }

  await page.goto("/settings")
  const settingsShot = await captureEvidence(page, "Configuracoes", "settings-overview", browser)
  appendManifest({
    kind: "ui",
    feature: "Configuracoes",
    scenarioId: "settings-overview",
    title: "Configurações da conta e integrações",
    role: "authenticated_user",
    route: "/settings",
    browser,
    notes: [
      "A tela resume dados da conta e status de integrações já configuradas.",
      "Use como referência rápida para confirmar ambiente e acesso.",
    ],
    screenshotPublicPath: settingsShot,
  })
})
