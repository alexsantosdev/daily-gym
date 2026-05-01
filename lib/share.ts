import { toBlob } from "html-to-image"

import { formatDatePtBr, minutesBetween, todayIsoDate } from "@/lib/date"
import { getWorkoutPlanGoalLabel } from "@/lib/labels"
import { extractRepsNumber } from "@/lib/reps"
import { estimateWorkoutCalories } from "@/lib/workoutCalories"
import type { ShareCardData, ShareCardType } from "@/types/share"
import type { StreakSummary } from "@/types/streak"
import type { Workout, WorkoutExecution, WorkoutPlan } from "@/types/workout"
import type {
  WorkoutIntensityLabel,
  WorkoutShareAIAnalysis,
  WorkoutShareAnalysisPayload,
  WorkoutShareCardData,
  WorkoutShareVisualMood,
} from "@/types/workoutShare"

export function getShareTitle(type: ShareCardType): string {
  if (type === "workout") {
    return "Treino compartilhado"
  }

  if (type === "activity") {
    return "Atividade compartilhada"
  }

  if (type === "streak") {
    return "Ofensiva compartilhada"
  }

  if (type === "competition") {
    return "Competicao compartilhada"
  }

  return "Recap mensal compartilhado"
}

function sanitizeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function getShareFileName(type: ShareCardType, date = todayIsoDate()) {
  const base = `${type}-${date}`
  return `${sanitizeFileName(base)}.png`
}

function extractBackgroundImageUrls(value: string): string[] {
  const matches = value.match(/url\((['"]?)(.*?)\1\)/g)
  if (!matches) {
    return []
  }

  return matches
    .map((match) => match.replace(/^url\((['"]?)/, "").replace(/(['"]?)\)$/, ""))
    .filter(Boolean)
}

async function waitForElementAssets(element: HTMLElement) {
  if (typeof document !== "undefined" && "fonts" in document) {
    const fontFaceSet = document.fonts
    await fontFaceSet.ready
  }

  const imageElements = Array.from(element.querySelectorAll("img"))

  const imagePromises = imageElements.map(
    (image) =>
      new Promise<void>((resolve) => {
        if (image.complete) {
          resolve()
          return
        }

        image.addEventListener("load", () => resolve(), { once: true })
        image.addEventListener("error", () => resolve(), { once: true })
      })
  )

  const rootStyle = window.getComputedStyle(element)
  const backgroundUrls = extractBackgroundImageUrls(rootStyle.backgroundImage).filter((url) => !url.startsWith("data:"))

  const backgroundPromises = backgroundUrls.map(
    (url) =>
      new Promise<void>((resolve) => {
        const image = new Image()
        image.crossOrigin = "anonymous"
        image.onload = () => resolve()
        image.onerror = () => resolve()
        image.src = url
      })
  )

  await Promise.all([...imagePromises, ...backgroundPromises])
}

export async function generateShareImage(element: HTMLElement): Promise<Blob> {
  await waitForElementAssets(element)
  await new Promise((resolve) => window.setTimeout(resolve, 80))

  const blob = await toBlob(element, {
    cacheBust: true,
    pixelRatio: 3,
    backgroundColor: "transparent",
  })

  if (!blob) {
    throw new Error("Nao foi possivel gerar a imagem de compartilhamento.")
  }

  return blob
}

export function downloadShareImage(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function shareImage(blob: Blob, title: string, filename: string): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false
  }

  const file = new File([blob], filename, { type: "image/png" })
  const payload: ShareData = {
    title,
    text: title,
    files: [file],
  }

  if (typeof navigator.canShare === "function" && !navigator.canShare(payload)) {
    return false
  }

  await navigator.share(payload)
  return true
}

function parseLoadValue(value?: string): number {
  if (!value) {
    return 0
  }

  const cleaned = value.replace(",", ".")
  const direct = Number.parseFloat(cleaned)
  if (Number.isFinite(direct)) {
    return direct
  }

  const match = cleaned.match(/\d+(\.\d+)?/)
  return match ? Number.parseFloat(match[0]) : 0
}

function buildWorkoutExecutionStats(execution: WorkoutExecution, workout?: Workout) {
  const totalExercises = workout?.exercises.length || execution.executedExercises.length
  const completedExercises = execution.executedExercises.filter((item) => item.completed).length

  const totalSets = execution.executedExercises.reduce((acc, item, index) => {
    const plannedSets = workout?.exercises[index]?.sets ?? 0
    return acc + (item.setsCompleted > 0 ? item.setsCompleted : plannedSets)
  }, 0)

  const totalReps = execution.executedExercises.reduce((acc, item, index) => {
    const plannedReps = extractRepsNumber(workout?.exercises[index]?.reps, 0)
    return acc + (item.repsCompleted > 0 ? item.repsCompleted : plannedReps)
  }, 0)

  const averageLoadKg = (() => {
    const loads = execution.executedExercises
      .map((item) => parseLoadValue(item.loadUsed))
      .filter((value) => value > 0)

    if (loads.length === 0) {
      return 0
    }

    return loads.reduce((acc, value) => acc + value, 0) / loads.length
  })()

  const durationMinutes =
    execution.durationMinutes && execution.durationMinutes > 0
      ? execution.durationMinutes
      : minutesBetween(execution.startedAt, execution.finishedAt)

  return {
    totalExercises,
    completedExercises,
    totalSets,
    totalReps,
    averageLoadKg,
    durationMinutes,
  }
}

function normalizeIntensityLabel(value: unknown, fallback: WorkoutIntensityLabel): WorkoutIntensityLabel {
  if (value === "leve" || value === "moderada" || value === "alta" || value === "muito_alta") {
    return value
  }

  return fallback
}

function normalizeVisualMood(value: unknown, fallback: WorkoutShareVisualMood): WorkoutShareVisualMood {
  if (value === "intense_fuchsia" || value === "neon_energy" || value === "dark_premium") {
    return value
  }

  return fallback
}

function buildStoryMetrics(story: WorkoutShareCardData): ShareCardData["metrics"] {
  return [
    { label: "Duracao", value: story.durationMinutes, suffix: "min", highlight: true },
    { label: "Exercicios", value: `${story.completedExercises}/${story.totalExercises}` },
    { label: "Calorias", value: story.estimatedCalories, suffix: "kcal" },
  ]
}

function buildWorkoutFallbackCopy(input: {
  status: WorkoutExecution["status"]
  durationMinutes: number
  currentStreak?: number
}) {
  if ((input.currentStreak ?? 0) >= 7) {
    return {
      kicker: "SEQUENCIA INABALAVEL",
      headline: "NAO QUEBREI.",
      motivationalPhrase: "Disciplina nao aparece do nada.",
      socialHook: "Agora minha disciplina tem historico.",
    }
  }

  if ((input.currentStreak ?? 0) >= 3) {
    return {
      kicker: "SEQUENCIA ATIVA",
      headline: "NAO QUEBREI.",
      motivationalPhrase: "Um dia perdido zera tudo. Hoje nao.",
      socialHook: "Cada treino conta. Agora aparece.",
    }
  }

  if (input.status === "partial") {
    return {
      kicker: "SEM DESCULPA",
      headline: "EU FUI.",
      motivationalPhrase: "Pouco ainda e mais que nada.",
      socialHook: "Meu progresso nao fica mais perdido.",
    }
  }

  if (input.durationMinutes < 15) {
    return {
      kicker: "CONSISTENCIA REAL",
      headline: "EU FUI.",
      motivationalPhrase: "Hoje eu fiz o minimo virar vitoria.",
      socialHook: "Minha rotina ficou visivel.",
    }
  }

  return {
    kicker: "DISCIPLINA REGISTRADA",
    headline: "TREINO FEITO.",
    motivationalPhrase: "O treino acabou. A evolucao nao.",
    socialHook: "Meu treino virou registro. Minha constancia virou placar.",
  }
}

function toStoryFallback(data: ShareCardData): WorkoutShareCardData {
  const durationMetric = data.metrics.find((metric) => metric.label.toLowerCase().includes("duracao"))
  const exercisesMetric = data.metrics.find((metric) => metric.label.toLowerCase().includes("exerc"))
  const caloriesMetric = data.metrics.find((metric) => metric.label.toLowerCase().includes("caloria"))
  const parsedDuration = Number(durationMetric?.value ?? 0)
  const exercisesText = String(exercisesMetric?.value ?? "0/0")
  const [completedText, totalText] = exercisesText.split("/")
  const completedExercises = Number.parseInt(completedText ?? "0", 10) || 0
  const totalExercises = Number.parseInt(totalText ?? `${completedExercises}`, 10) || completedExercises
  const parsedCalories = Number(caloriesMetric?.value ?? 220)

  return {
    cardType: data.type,
    badgeLabel: data.badge ?? "Workout",
    userName: data.userName,
    workoutName: data.subtitle ?? "Registro",
    date: data.date,
    durationMinutes: Number.isFinite(parsedDuration) ? parsedDuration : 0,
    totalExercises: Math.max(1, totalExercises),
    completedExercises: Math.max(0, completedExercises),
    estimatedCalories: Number.isFinite(parsedCalories) ? parsedCalories : 220,
    intensityLabel: "moderada",
    headline: data.title || "TREINO FEITO.",
    kicker: "DISCIPLINA REGISTRADA",
    subtitle: data.subtitle ?? "Progresso registrado",
    motivationalPhrase: data.highlight ?? "O treino acabou. A evolucao nao.",
    performanceHighlight: data.highlight ?? "Treino registrado no daily-gym.",
    socialHook: "Minha constancia ficou visivel.",
    ctaText: data.footer ?? "feito com daily-gym",
    brandFooter: data.footer ?? "feito com daily-gym",
    visualMood: "intense_fuchsia",
    photoUrl: data.photoUrl,
  }
}

export function applyWorkoutAnalysisToShareData(
  data: ShareCardData,
  analysis: WorkoutShareAIAnalysis
): ShareCardData {
  const existingStory = data.workoutStory ?? toStoryFallback(data)

  const story: WorkoutShareCardData = {
    ...existingStory,
    headline: analysis.headline,
    kicker: analysis.kicker,
    subtitle: analysis.subtitle,
    motivationalPhrase: analysis.motivationalPhrase,
    performanceHighlight: analysis.performanceHighlight,
    socialHook: analysis.socialHook,
    ctaText: analysis.ctaText,
    estimatedCalories: analysis.estimatedCalories,
    intensityLabel: normalizeIntensityLabel(analysis.intensityLabel, existingStory.intensityLabel),
    visualMood: normalizeVisualMood(analysis.visualMood, existingStory.visualMood),
  }

  return {
    ...data,
    title: story.headline,
    subtitle: story.subtitle,
    highlight: story.motivationalPhrase,
    shareCaption: `${story.socialHook} ${analysis.ctaText}`,
    hashtags: analysis.hashtags,
    workoutStory: story,
    metrics: buildStoryMetrics(story),
  }
}

export function buildWorkoutShareData(input: {
  userName: string
  workoutName: string
  planName?: string
  execution: WorkoutExecution
  exercisesTotal: number
  highlightLoad?: string
  workout?: Workout
  workoutPlan?: WorkoutPlan
  userWeightKg?: number
  currentStreak?: number
  recentHistory?: Array<Pick<WorkoutExecution, "id" | "date" | "durationMinutes" | "status">>
}): ShareCardData {
  const stats = buildWorkoutExecutionStats(input.execution, input.workout)

  const calories = estimateWorkoutCalories({
    durationMinutes: stats.durationMinutes,
    userWeightKg: input.userWeightKg,
    totalSets: stats.totalSets,
    totalReps: stats.totalReps,
    averageLoadKg: stats.averageLoadKg,
    muscleGroup: input.workout?.muscleGroup,
    workoutGoal: input.workoutPlan?.goal,
  })

  const goalLabel = input.workoutPlan ? getWorkoutPlanGoalLabel(input.workoutPlan.goal) : undefined
  const copy = buildWorkoutFallbackCopy({
    status: input.execution.status,
    durationMinutes: Math.max(1, stats.durationMinutes),
    currentStreak: input.currentStreak,
  })

  const performanceHighlight =
    Math.max(1, stats.durationMinutes) < 15
      ? `${Math.max(0, stats.completedExercises)}/${Math.max(1, stats.totalExercises)} exercicios concluidos com consistencia`
      : `${Math.max(0, stats.completedExercises)}/${Math.max(1, stats.totalExercises)} exercicios • intensidade ${calories.intensityLabel}`

  const workoutStory: WorkoutShareCardData = {
    cardType: "workout",
    badgeLabel: "Workout",
    userName: input.userName,
    workoutName: input.workoutName,
    planName: input.planName,
    goalLabel,
    date: formatDatePtBr(input.execution.date),
    durationMinutes: Math.max(1, stats.durationMinutes),
    totalExercises: Math.max(1, stats.totalExercises || input.exercisesTotal),
    completedExercises: Math.max(0, stats.completedExercises),
    estimatedCalories: calories.estimatedCalories,
    intensityLabel: calories.intensityLabel,
    currentStreak: input.currentStreak,
    headline: copy.headline,
    kicker: copy.kicker,
    subtitle: `${input.workoutName}${goalLabel ? ` • ${goalLabel}` : ""}`,
    motivationalPhrase: copy.motivationalPhrase,
    performanceHighlight,
    socialHook: copy.socialHook,
    ctaText: "feito com daily-gym",
    photoUrl: input.execution.photoUrl,
    brandFooter: "feito com daily-gym",
    visualMood: "intense_fuchsia",
  }

  const workoutAnalysisPayload: WorkoutShareAnalysisPayload | undefined =
    input.workout && input.workoutPlan
      ? {
          workoutExecution: input.execution,
          workout: input.workout,
          workoutPlan: input.workoutPlan,
          userProfile:
            typeof input.userWeightKg === "number"
              ? {
                  displayName: input.userName,
                  weightKg: input.userWeightKg,
                  goal: input.workoutPlan.goal,
                  experienceLevel: "intermediate",
                  availableTimeMinutes: 60,
                }
              : undefined,
          streakSummary:
            typeof input.currentStreak === "number"
              ? {
                  currentStreak: input.currentStreak,
                  weeklyPercentage: 0,
                  todayStatus: "completed",
                }
              : undefined,
          recentHistory: input.recentHistory,
        }
      : undefined

  return {
    type: "workout",
    title: workoutStory.headline,
    subtitle: workoutStory.subtitle,
    userName: input.userName,
    date: workoutStory.date,
    photoUrl: input.execution.photoUrl,
    badge: workoutStory.badgeLabel,
    highlight: workoutStory.motivationalPhrase,
    metrics: buildStoryMetrics(workoutStory),
    footer: workoutStory.brandFooter,
    workoutStory,
    workoutAnalysisPayload,
    shareCaption: `${workoutStory.socialHook} ${workoutStory.ctaText}`,
    hashtags: ["#dailygym", "#disciplina", "#treinofeito"],
  }
}

export function buildStreakShareData(input: {
  userName: string
  summary: StreakSummary
}): ShareCardData {
  const headline = input.summary.currentStreak >= 3 ? "A OFENSIVA CONTINUA." : "NAO QUEBREI."
  const workoutStory: WorkoutShareCardData = {
    cardType: "streak",
    badgeLabel: "Streak",
    userName: input.userName,
    workoutName: "Ofensiva semanal",
    date: formatDatePtBr(todayIsoDate()),
    durationMinutes: input.summary.weeklyCompleted * 10,
    totalExercises: Math.max(1, input.summary.weeklyPlanned),
    completedExercises: input.summary.weeklyCompleted,
    estimatedCalories: Math.max(120, input.summary.weeklyCompleted * 110),
    intensityLabel: input.summary.weeklyPercentage >= 80 ? "alta" : "moderada",
    currentStreak: input.summary.currentStreak,
    kicker: "SEQUENCIA ATIVA",
    headline,
    subtitle: "Consistencia nos dias planejados",
    performanceHighlight: `${input.summary.weeklyCompleted}/${input.summary.weeklyPlanned} treinos na semana`,
    motivationalPhrase: "Um dia perdido zera tudo. Hoje nao.",
    socialHook: "Minha constancia ficou visivel.",
    ctaText: "feito com daily-gym",
    brandFooter: "feito com daily-gym",
    visualMood: "dark_premium",
  }

  return {
    type: "streak",
    title: workoutStory.headline,
    subtitle: workoutStory.subtitle,
    userName: input.userName,
    date: workoutStory.date,
    badge: workoutStory.badgeLabel,
    highlight: workoutStory.motivationalPhrase,
    metrics: buildStoryMetrics(workoutStory),
    footer: workoutStory.brandFooter,
    workoutStory,
    shareCaption: `${workoutStory.socialHook} ${workoutStory.ctaText}`,
    hashtags: ["#dailygym", "#ofensiva", "#consistencia"],
  }
}

export function buildCompetitionShareData(input: {
  userName: string
  groupName: string
  rank: number
  points: number
  rivalName?: string
  rivalPoints?: number
  pointsDiff?: number
  highlight?: string
  rivalPhotoUrl?: string
}): ShareCardData {
  const isLeading = input.rank === 1
  const diff = Math.max(0, input.pointsDiff ?? 0)

  const workoutStory: WorkoutShareCardData = {
    cardType: "competition",
    badgeLabel: "Challenge",
    userName: input.userName,
    workoutName: input.groupName,
    date: formatDatePtBr(todayIsoDate()),
    durationMinutes: Math.max(1, Math.round(input.points / 8)),
    totalExercises: Math.max(1, input.rivalPoints ?? input.points),
    completedExercises: input.points,
    estimatedCalories: Math.max(120, Math.round(input.points * 1.6)),
    intensityLabel: isLeading ? "alta" : "moderada",
    kicker: "PLACAR DA SEMANA",
    headline: isLeading ? "LIDERANCA MANTIDA." : "AINDA DA PRA VIRAR.",
    subtitle: isLeading
      ? `${input.groupName} • voce no topo`
      : `${input.groupName} • falta pouco para encostar`,
    performanceHighlight: isLeading
      ? `Voce com ${input.points} pts na frente`
      : `Faltam ${diff} pts para passar ${input.rivalName ?? "seu rival"}`,
    motivationalPhrase: isLeading ? "O placar nao mente." : "A semana ainda nao acabou.",
    socialHook: isLeading ? "Minha constancia virou lideranca." : "Estou atras, mas nao parado.",
    ctaText: "feito com daily-gym",
    photoUrl: input.rivalPhotoUrl,
    brandFooter: "feito com daily-gym",
    visualMood: "neon_energy",
  }

  return {
    type: "competition",
    title: workoutStory.headline,
    subtitle: workoutStory.subtitle,
    userName: input.userName,
    date: workoutStory.date,
    badge: workoutStory.badgeLabel,
    photoUrl: input.rivalPhotoUrl,
    highlight: workoutStory.motivationalPhrase,
    metrics: buildStoryMetrics(workoutStory),
    footer: workoutStory.brandFooter,
    workoutStory,
    shareCaption: `${workoutStory.socialHook} ${workoutStory.ctaText}`,
    hashtags: ["#dailygym", "#competicao", "#placar"],
  }
}

export function buildActivityShareData(input: {
  userName: string
  name: string
  durationMinutes?: number
  date: string
  photoUrl?: string
}): ShareCardData {
  const duration = Math.max(1, input.durationMinutes ?? 20)

  const workoutStory: WorkoutShareCardData = {
    cardType: "activity",
    badgeLabel: "Activity",
    userName: input.userName,
    workoutName: input.name,
    date: formatDatePtBr(input.date),
    durationMinutes: duration,
    totalExercises: 1,
    completedExercises: 1,
    estimatedCalories: Math.max(60, Math.round(duration * 4.6)),
    intensityLabel: duration >= 40 ? "moderada" : "leve",
    kicker: "MOVIMENTO CONTA",
    headline: "EU ME MEXI.",
    subtitle: `${input.name} • consistencia fora da academia`,
    performanceHighlight: `${duration} min registrados hoje`,
    motivationalPhrase: "Nem todo progresso acontece na academia.",
    socialHook: "Minha rotina ativa ficou visivel.",
    ctaText: "feito com daily-gym",
    photoUrl: input.photoUrl,
    brandFooter: "feito com daily-gym",
    visualMood: "dark_premium",
  }

  return {
    type: "activity",
    title: workoutStory.headline,
    subtitle: workoutStory.subtitle,
    userName: input.userName,
    date: workoutStory.date,
    photoUrl: input.photoUrl,
    badge: workoutStory.badgeLabel,
    highlight: workoutStory.motivationalPhrase,
    metrics: buildStoryMetrics(workoutStory),
    footer: workoutStory.brandFooter,
    workoutStory,
    shareCaption: `${workoutStory.socialHook} ${workoutStory.ctaText}`,
    hashtags: ["#dailygym", "#atividade", "#constancia"],
  }
}

export function buildMonthlyRecapShareData(input: {
  userName: string
  monthLabel: string
  workouts: number
  activities: number
  meals: number
  bestStreak: number
  photos: number
  competitionRank?: number
}): ShareCardData {
  const workoutStory: WorkoutShareCardData = {
    cardType: "monthly_recap",
    badgeLabel: "Recap",
    userName: input.userName,
    workoutName: `Resumo ${input.monthLabel}`,
    date: formatDatePtBr(todayIsoDate()),
    durationMinutes: Math.max(1, input.workouts * 12),
    totalExercises: Math.max(1, input.workouts + input.activities),
    completedExercises: input.workouts,
    estimatedCalories: Math.max(200, input.workouts * 180 + input.activities * 70),
    intensityLabel: input.workouts >= 12 ? "alta" : "moderada",
    currentStreak: input.bestStreak,
    kicker: "MES FECHADO",
    headline: "CONSISTENCIA REGISTRADA.",
    subtitle: `${input.monthLabel} • ${input.workouts} treinos`,
    performanceHighlight: `${input.activities} atividades • ${input.bestStreak} dias de melhor ofensiva`,
    motivationalPhrase: "Meu progresso saiu da cabeca e foi para o placar.",
    socialHook: "Eu registro. Eu comparo. Eu evoluo.",
    ctaText: "feito com daily-gym",
    brandFooter: "feito com daily-gym",
    visualMood: "dark_premium",
  }

  return {
    type: "monthly_recap",
    title: workoutStory.headline,
    subtitle: workoutStory.subtitle,
    userName: input.userName,
    date: workoutStory.date,
    badge: workoutStory.badgeLabel,
    highlight: workoutStory.motivationalPhrase,
    metrics: buildStoryMetrics(workoutStory),
    footer: workoutStory.brandFooter,
    workoutStory,
    shareCaption: `${workoutStory.socialHook} ${workoutStory.ctaText}`,
    hashtags: ["#dailygym", "#recap", "#evolucao"],
  }
}

export function ensureStoryCardData(data: ShareCardData): WorkoutShareCardData {
  return data.workoutStory ?? toStoryFallback(data)
}
