import type { Workout, WorkoutExercise } from "@/types/workout"

export function isCardioLabel(value?: string): boolean {
  const normalized = (value ?? "").trim().toLowerCase()
  return (
    normalized.includes("cardio") ||
    normalized.includes("corrida") ||
    normalized.includes("run") ||
    normalized.includes("caminhada")
  )
}

export function isCardioExercise(
  exercise: WorkoutExercise | undefined,
  workoutMuscleGroup?: string
): boolean {
  return isCardioLabel(exercise?.muscleGroup) || isCardioLabel(workoutMuscleGroup)
}

export function isCardioWorkout(workout: Workout | null | undefined): boolean {
  if (!workout) {
    return false
  }

  if (isCardioLabel(workout.muscleGroup)) {
    return true
  }

  return workout.exercises.some((exercise) => isCardioExercise(exercise, workout.muscleGroup))
}
