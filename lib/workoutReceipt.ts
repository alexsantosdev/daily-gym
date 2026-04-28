import type { Workout, WorkoutExecution } from "@/types/workout"

export interface WorkoutReceiptItem {
  index: number
  name: string
  muscleGroup?: string
  plannedSets?: number
  plannedReps?: number
  plannedLoad?: string
  executedSets?: number
  executedReps?: number
  executedLoad?: string
  completed: boolean
  notes?: string
}

function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase()
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

    return {
      index: index + 1,
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      plannedSets: exercise.sets,
      plannedReps: exercise.reps,
      plannedLoad: exercise.suggestedLoad,
      executedSets: matched?.setsCompleted,
      executedReps: matched?.repsCompleted,
      executedLoad: matched?.loadUsed,
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
      plannedSets: undefined,
      plannedReps: undefined,
      plannedLoad: undefined,
      executedSets: exercise.setsCompleted,
      executedReps: exercise.repsCompleted,
      executedLoad: exercise.loadUsed,
      completed: exercise.completed,
      notes: exercise.notes,
    }))

  return [...plannedItems, ...extraExecutedItems]
}
