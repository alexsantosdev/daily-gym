import type { Workout, WorkoutExecution } from "@/types/workout"
import { extractRepsNumber } from "@/lib/reps"
import { isCardioLabel } from "@/lib/workoutMode"

export interface WorkoutReceiptItem {
  index: number
  name: string
  muscleGroup?: string
  isCardio?: boolean
  plannedSets?: number
  plannedReps?: string
  plannedLoad?: string
  executedSets?: number
  executedReps?: number
  executedLoad?: string
  executedStartedAt?: string
  executedFinishedAt?: string
  executedDurationMinutes?: number
  plannedCardioSummary?: string
  executedCardioSummary?: string
  completed: boolean
  notes?: string
}

function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase()
}

function formatDistanceKm(value?: string): string | null {
  const normalized = value?.trim()
  if (!normalized) {
    return null
  }

  if (/\bkm\b/i.test(normalized)) {
    return normalized
  }

  return `${normalized} km`
}

function buildCardioSummary(values: {
  blocks?: number
  durationMinutes?: number
  distanceKm?: string
  rhythm?: string
}): string | undefined {
  const blocks = values.blocks && values.blocks > 0 ? `${values.blocks} blocos` : null
  const duration =
    values.durationMinutes && values.durationMinutes > 0 ? `${values.durationMinutes} min` : null
  const distance = formatDistanceKm(values.distanceKm)
  const rhythm = values.rhythm?.trim() ? `Ritmo: ${values.rhythm.trim()}` : null
  const summary = [blocks, duration, distance, rhythm].filter(Boolean).join(" | ")
  return summary || undefined
}

function minutesBetween(start?: string, end?: string): number | undefined {
  if (!start || !end) {
    return undefined
  }

  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs < startMs) {
    return undefined
  }

  return Math.max(1, Math.round((endMs - startMs) / 60000))
}

export function buildWorkoutReceiptItems(
  workout?: Workout,
  execution?: WorkoutExecution
): WorkoutReceiptItem[] {
  const plannedExercises = workout?.exercises ?? []
  const executedExercises = execution?.executedExercises ?? []

  const executedByName = new Map(
    executedExercises.map((exercise) => [normalizeExerciseName(exercise.exerciseName), exercise] as const)
  )

  const plannedItems = plannedExercises.map((exercise, index) => {
    const matched = executedByName.get(normalizeExerciseName(exercise.name))
    const cardioExercise = isCardioLabel(exercise.muscleGroup) || isCardioLabel(workout?.muscleGroup)

    return {
      index: index + 1,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      isCardio: cardioExercise,
      plannedSets: exercise.sets,
      plannedReps: exercise.reps,
      plannedLoad: exercise.suggestedLoad,
      executedSets: matched?.setsCompleted,
      executedReps: matched?.repsCompleted,
      executedLoad: matched?.loadUsed,
      executedStartedAt: matched?.exerciseStartedAt,
      executedFinishedAt: matched?.exerciseFinishedAt,
      executedDurationMinutes: minutesBetween(matched?.exerciseStartedAt, matched?.exerciseFinishedAt),
      plannedCardioSummary: cardioExercise
        ? buildCardioSummary({
            blocks: exercise.sets,
            durationMinutes: extractRepsNumber(exercise.reps, 0),
            rhythm: exercise.suggestedLoad,
          })
        : undefined,
      executedCardioSummary: cardioExercise
        ? buildCardioSummary({
            blocks: matched?.setsCompleted,
            durationMinutes: matched?.repsCompleted,
            distanceKm: matched?.loadUsed,
            rhythm: matched?.notes,
          })
        : undefined,
      completed: matched?.completed ?? false,
      notes: matched?.notes,
    } satisfies WorkoutReceiptItem
  })

  if (!execution) {
    return plannedItems
  }

  const knownNames = new Set(plannedItems.map((item) => normalizeExerciseName(item.name)))
  const extraExecutedItems = executedExercises
    .filter((exercise) => !knownNames.has(normalizeExerciseName(exercise.exerciseName)))
    .map((exercise, index) => ({
      index: plannedItems.length + index + 1,
      name: exercise.exerciseName,
      muscleGroup: undefined,
      isCardio: false,
      plannedSets: undefined,
      plannedReps: undefined,
      plannedLoad: undefined,
      executedSets: exercise.setsCompleted,
      executedReps: exercise.repsCompleted,
      executedLoad: exercise.loadUsed,
      executedStartedAt: exercise.exerciseStartedAt,
      executedFinishedAt: exercise.exerciseFinishedAt,
      executedDurationMinutes: minutesBetween(exercise.exerciseStartedAt, exercise.exerciseFinishedAt),
      plannedCardioSummary: undefined,
      executedCardioSummary: undefined,
      completed: exercise.completed,
      notes: exercise.notes,
    }))

  return [...plannedItems, ...extraExecutedItems]
}
