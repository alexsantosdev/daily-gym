import {
  buildWorkoutShareAnalysisUserPrompt,
  WORKOUT_SHARE_ANALYSIS_SYSTEM_PROMPT,
} from "@/lib/aiPrompts"
import { minutesBetween } from "@/lib/date"
import { getWorkoutPlanGoalLabel } from "@/lib/labels"
import { estimateWorkoutCalories } from "@/lib/workoutCalories"
import type {
  WorkoutIntensityLabel,
  WorkoutShareAIAnalysis,
  WorkoutShareAnalysisPayload,
  WorkoutShareVisualMood,
} from "@/types/workoutShare"

const DEFAULT_VISUAL_MOOD: WorkoutShareVisualMood = "intense_fuchsia"

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeIntensity(value: unknown): WorkoutIntensityLabel {
  if (value === "leve" || value === "moderada" || value === "alta" || value === "muito_alta") {
    return value
  }

  return "moderada"
}

function normalizeVisualMood(value: unknown): WorkoutShareVisualMood {
  if (value === "intense_fuchsia" || value === "neon_energy" || value === "dark_premium") {
    return value
  }

  if (value === "clean_dark") {
    return "dark_premium"
  }

  return DEFAULT_VISUAL_MOOD
}

function parseLoadValue(value?: string): number {
  if (!value) {
    return 0
  }

  const cleaned = value.replace(",", ".")
  const numeric = Number.parseFloat(cleaned)

  if (Number.isFinite(numeric)) {
    return numeric
  }

  const match = cleaned.match(/\d+(\.\d+)?/)
  return match ? Number.parseFloat(match[0]) : 0
}

function buildExerciseStats(payload: WorkoutShareAnalysisPayload) {
  const plannedExercises = payload.workout.exercises
  const executedExercises = payload.workoutExecution.executedExercises

  const totalExercises = plannedExercises.length > 0 ? plannedExercises.length : executedExercises.length
  const completedExercises = executedExercises.filter((item) => item.completed).length

  const totalSets = executedExercises.reduce((acc, item, index) => {
    const sets = item.setsCompleted > 0 ? item.setsCompleted : (plannedExercises[index]?.sets ?? 0)
    return acc + sets
  }, 0)

  const totalReps = executedExercises.reduce((acc, item, index) => {
    const reps = item.repsCompleted > 0 ? item.repsCompleted : (plannedExercises[index]?.reps ?? 0)
    return acc + reps
  }, 0)

  const loads = executedExercises
    .map((item) => parseLoadValue(item.loadUsed))
    .filter((value) => value > 0)

  const averageLoadKg = loads.length > 0 ? loads.reduce((acc, value) => acc + value, 0) / loads.length : 0

  return {
    totalExercises,
    completedExercises,
    totalSets,
    totalReps,
    averageLoadKg,
  }
}

function getDurationMinutes(payload: WorkoutShareAnalysisPayload): number {
  if (typeof payload.workoutExecution.durationMinutes === "number" && payload.workoutExecution.durationMinutes > 0) {
    return payload.workoutExecution.durationMinutes
  }

  return minutesBetween(payload.workoutExecution.startedAt, payload.workoutExecution.finishedAt)
}

function buildMockHashtags(payload: WorkoutShareAnalysisPayload): string[] {
  const normalizedMuscleTag = payload.workout.muscleGroup
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")

  const tags = new Set<string>(["#dailygym", "#disciplina"])

  if ((payload.streakSummary?.currentStreak ?? 0) >= 3) {
    tags.add("#ofensiva")
    tags.add("#constancia")
  } else if (payload.workoutExecution.status === "partial") {
    tags.add("#semdesculpa")
    tags.add("#consistenciareal")
  } else {
    tags.add("#treinofeito")
  }

  if (normalizedMuscleTag.length > 0) {
    tags.add(`#${normalizedMuscleTag}`)
  }

  return Array.from(tags).slice(0, 5)
}

function pickWorkoutViralTemplate(input: {
  status: WorkoutShareAnalysisPayload["workoutExecution"]["status"]
  streak: number
  durationMinutes: number
  completedExercises: number
  totalExercises: number
  totalSets: number
  averageLoadKg: number
  intensityLabel: WorkoutIntensityLabel
}) {
  const hasStrongStreak = input.streak >= 3
  const hasVeryStrongStreak = input.streak >= 7
  const isShortWorkout = input.durationMinutes < 15
  const isLongWorkout = input.durationMinutes >= 55
  const hasHighVolume = input.totalSets >= 20 || input.completedExercises >= 6
  const hasHighIntensity =
    input.intensityLabel === "alta" || input.intensityLabel === "muito_alta" || input.averageLoadKg >= 70

  const defaultTemplate = {
    kicker: "DISCIPLINA REGISTRADA",
    headline: "TREINO FEITO.",
    phrase: "O treino acabou. A evolucao nao.",
    socialHook: "Meu treino virou registro. Minha constancia virou placar.",
    visualMood: "intense_fuchsia" as WorkoutShareVisualMood,
  }

  if (hasVeryStrongStreak) {
    return {
      kicker: "SEQUENCIA INABALAVEL",
      headline: "NAO QUEBREI.",
      phrase: "Disciplina nao aparece do nada.",
      socialHook: "Agora minha disciplina tem historico.",
      visualMood: "dark_premium" as WorkoutShareVisualMood,
    }
  }

  if (hasStrongStreak) {
    return {
      kicker: "SEQUENCIA ATIVA",
      headline: "NAO QUEBREI.",
      phrase: "Um dia perdido zera tudo. Hoje nao.",
      socialHook: "Cada treino conta. Agora aparece.",
      visualMood: "intense_fuchsia" as WorkoutShareVisualMood,
    }
  }

  if (input.status === "partial") {
    return {
      kicker: "SEM DESCULPA",
      headline: "EU FUI.",
      phrase: "Pouco ainda e mais que nada.",
      socialHook: "Meu progresso nao fica mais perdido.",
      visualMood: "neon_energy" as WorkoutShareVisualMood,
    }
  }

  if (isShortWorkout) {
    return {
      kicker: "CONSISTENCIA REAL",
      headline: "EU FUI.",
      phrase: "Hoje eu fiz o minimo virar vitoria.",
      socialHook: "Minha rotina ficou visivel.",
      visualMood: "neon_energy" as WorkoutShareVisualMood,
    }
  }

  if (hasHighIntensity) {
    return {
      kicker: "INTENSIDADE REGISTRADA",
      headline: "SEM DESCULPA.",
      phrase: "Enquanto dava pra adiar, eu fui.",
      socialHook: "Meu treino virou registro. Minha constancia virou placar.",
      visualMood: "neon_energy" as WorkoutShareVisualMood,
    }
  }

  if (hasHighVolume || isLongWorkout) {
    return {
      kicker: "VOLUME COMPLETO",
      headline: "MAIS UM NA CONTA.",
      phrase: "Constancia hoje. Resultado depois.",
      socialHook: "Cada treino conta. Agora aparece.",
      visualMood: "intense_fuchsia" as WorkoutShareVisualMood,
    }
  }

  return defaultTemplate
}

export function validateWorkoutShareAnalysisPayload(payload: unknown): payload is WorkoutShareAnalysisPayload {
  if (!payload || typeof payload !== "object") {
    return false
  }

  const candidate = payload as Record<string, unknown>
  const workoutExecution = candidate.workoutExecution
  const workout = candidate.workout

  if (!workoutExecution || typeof workoutExecution !== "object" || !workout || typeof workout !== "object") {
    return false
  }

  const executionCandidate = workoutExecution as Record<string, unknown>
  const workoutCandidate = workout as Record<string, unknown>

  return (
    typeof executionCandidate.date === "string" &&
    typeof executionCandidate.status === "string" &&
    Array.isArray(executionCandidate.executedExercises) &&
    typeof workoutCandidate.name === "string" &&
    Array.isArray(workoutCandidate.exercises)
  )
}

export function buildMockWorkoutShareAnalysis(payload: WorkoutShareAnalysisPayload): WorkoutShareAIAnalysis {
  const durationMinutes = Math.max(1, getDurationMinutes(payload))
  const exerciseStats = buildExerciseStats(payload)
  const caloriesEstimate = estimateWorkoutCalories({
    durationMinutes,
    userWeightKg: payload.userProfile?.weightKg,
    totalSets: exerciseStats.totalSets,
    totalReps: exerciseStats.totalReps,
    averageLoadKg: exerciseStats.averageLoadKg,
    muscleGroup: payload.workout.muscleGroup,
    workoutGoal: payload.workoutPlan?.goal,
  })

  const goalLabel = payload.workoutPlan ? getWorkoutPlanGoalLabel(payload.workoutPlan.goal) : "Evolucao"
  const streak = payload.streakSummary?.currentStreak ?? 0
  const template = pickWorkoutViralTemplate({
    status: payload.workoutExecution.status,
    streak,
    durationMinutes,
    completedExercises: exerciseStats.completedExercises,
    totalExercises: exerciseStats.totalExercises,
    totalSets: exerciseStats.totalSets,
    averageLoadKg: exerciseStats.averageLoadKg,
    intensityLabel: caloriesEstimate.intensityLabel,
  })

  const hasHighVolume = exerciseStats.totalSets >= 20 || exerciseStats.completedExercises >= 6
  const hasHighIntensity = caloriesEstimate.intensityLabel === "alta" || caloriesEstimate.intensityLabel === "muito_alta"
  const performanceHighlight = (() => {
    if (durationMinutes < 15) {
      return `${exerciseStats.completedExercises} exercicios finalizados`
    }

    if (hasHighIntensity) {
      return `${exerciseStats.completedExercises} exercicios com intensidade ${caloriesEstimate.intensityLabel}`
    }

    if (hasHighVolume) {
      return `Volume completo registrado em ${exerciseStats.completedExercises} exercicios`
    }

    return `${exerciseStats.completedExercises}/${exerciseStats.totalExercises} exercicios concluidos`
  })()

  return {
    kicker: template.kicker,
    headline: template.headline,
    subtitle: `${payload.workout.name} • ${goalLabel}`,
    motivationalPhrase: template.phrase,
    performanceHighlight,
    socialHook: template.socialHook,
    ctaText: "feito com daily-gym",
    intensityLabel: caloriesEstimate.intensityLabel,
    estimatedCalories: caloriesEstimate.estimatedCalories,
    hashtags: buildMockHashtags(payload),
    visualMood: template.visualMood,
  }
}

function extractTextFromOpenAIResponse(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null
  }

  const candidate = payload as Record<string, unknown>

  if (typeof candidate.output_text === "string") {
    return candidate.output_text
  }

  const output = candidate.output
  if (!Array.isArray(output)) {
    return null
  }

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue
    }

    const content = (item as Record<string, unknown>).content
    if (!Array.isArray(content)) {
      continue
    }

    for (const contentItem of content) {
      if (!contentItem || typeof contentItem !== "object") {
        continue
      }

      const text = (contentItem as Record<string, unknown>).text
      if (typeof text === "string") {
        return text
      }
    }
  }

  return null
}

function normalizeAnalysis(
  raw: Partial<WorkoutShareAIAnalysis>,
  fallback: WorkoutShareAIAnalysis
): WorkoutShareAIAnalysis {
  const calories = Number.isFinite(raw.estimatedCalories)
    ? Math.round(raw.estimatedCalories as number)
    : fallback.estimatedCalories

  return {
    headline: (raw.headline ?? fallback.headline).trim(),
    kicker: (raw.kicker ?? fallback.kicker).trim(),
    subtitle: (raw.subtitle ?? fallback.subtitle).trim(),
    motivationalPhrase: (raw.motivationalPhrase ?? fallback.motivationalPhrase).trim(),
    performanceHighlight: (raw.performanceHighlight ?? fallback.performanceHighlight).trim(),
    socialHook: (raw.socialHook ?? fallback.socialHook).trim(),
    ctaText: (raw.ctaText ?? fallback.ctaText).trim(),
    intensityLabel: normalizeIntensity(raw.intensityLabel),
    estimatedCalories: clamp(calories, 0, 1600),
    hashtags:
      Array.isArray(raw.hashtags) && raw.hashtags.length > 0
        ? raw.hashtags.filter((tag): tag is string => typeof tag === "string").slice(0, 6)
        : fallback.hashtags,
    visualMood: normalizeVisualMood(raw.visualMood),
  }
}

async function generateOpenAIWorkoutShareAnalysis(
  payload: WorkoutShareAnalysisPayload
): Promise<WorkoutShareAIAnalysis> {
  const contextJson = JSON.stringify(payload)
  const userPrompt = buildWorkoutShareAnalysisUserPrompt(contextJson)

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        { role: "system", content: WORKOUT_SHARE_ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`)
  }

  const openAIResult = (await response.json()) as unknown
  const text = extractTextFromOpenAIResponse(openAIResult)

  if (!text) {
    throw new Error("OpenAI nao retornou texto parseavel para o share card.")
  }

  return JSON.parse(text) as WorkoutShareAIAnalysis
}

export async function generateWorkoutShareAnalysis(
  payload: WorkoutShareAnalysisPayload
): Promise<WorkoutShareAIAnalysis> {
  const fallback = buildMockWorkoutShareAnalysis(payload)

  if (!process.env.OPENAI_API_KEY) {
    return fallback
  }

  try {
    const raw = await generateOpenAIWorkoutShareAnalysis(payload)
    return normalizeAnalysis(raw, fallback)
  } catch (error) {
    console.warn("Falha ao gerar analise OpenAI para share card. Usando fallback local.", error)
    return fallback
  }
}

export async function requestWorkoutShareAnalysis(
  payload: WorkoutShareAnalysisPayload
): Promise<WorkoutShareAIAnalysis> {
  const response = await fetch("/api/workout-share-analysis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error("Nao foi possivel analisar o treino para compartilhar.")
  }

  const result = (await response.json()) as { analysis: WorkoutShareAIAnalysis }
  return result.analysis
}
