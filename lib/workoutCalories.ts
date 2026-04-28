import type {
  WorkoutCaloriesEstimateInput,
  WorkoutCaloriesEstimateResult,
  WorkoutIntensityLabel,
} from "@/types/workoutShare"

const MET_BY_INTENSITY: Record<WorkoutIntensityLabel, number> = {
  leve: 3.8,
  moderada: 5.2,
  alta: 6.5,
  muito_alta: 7.4,
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function normalizeDuration(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1
  }

  return Math.round(value)
}

function inferIntensityLabel(input: WorkoutCaloriesEstimateInput): WorkoutIntensityLabel {
  if (input.workoutIntensity) {
    return input.workoutIntensity
  }

  let score = 0
  const duration = normalizeDuration(input.durationMinutes)
  const totalSets = input.totalSets ?? 0
  const totalReps = input.totalReps ?? 0
  const averageLoadKg = input.averageLoadKg ?? 0

  if (duration >= 65) {
    score += 3
  } else if (duration >= 45) {
    score += 2
  } else if (duration >= 25) {
    score += 1
  }

  if (totalSets >= 24) {
    score += 3
  } else if (totalSets >= 16) {
    score += 2
  } else if (totalSets >= 8) {
    score += 1
  }

  if (totalReps >= 220) {
    score += 2
  } else if (totalReps >= 120) {
    score += 1
  }

  if (averageLoadKg >= 70) {
    score += 2
  } else if (averageLoadKg >= 35) {
    score += 1
  }

  if ((input.workoutGoal ?? "").toLowerCase().includes("strength")) {
    score += 1
  }

  if (score >= 8) {
    return "muito_alta"
  }

  if (score >= 5) {
    return "alta"
  }

  if (score >= 3) {
    return "moderada"
  }

  return "leve"
}

function inferConfidence(input: WorkoutCaloriesEstimateInput): WorkoutCaloriesEstimateResult["confidence"] {
  const hasWeight = typeof input.userWeightKg === "number" && input.userWeightKg > 0
  const hasVolume = (input.totalSets ?? 0) > 0 && (input.totalReps ?? 0) > 0
  const hasLoad = (input.averageLoadKg ?? 0) > 0

  if (hasWeight && hasVolume && hasLoad) {
    return "high"
  }

  if ((hasWeight && hasVolume) || (hasWeight && hasLoad) || (hasVolume && hasLoad)) {
    return "medium"
  }

  return "low"
}

export function estimateWorkoutCalories(input: WorkoutCaloriesEstimateInput): WorkoutCaloriesEstimateResult {
  const durationMinutes = normalizeDuration(input.durationMinutes)
  const weightKg = clamp(input.userWeightKg ?? 72, 45, 180)
  const intensityLabel = inferIntensityLabel(input)
  const met = MET_BY_INTENSITY[intensityLabel]

  const totalSets = input.totalSets ?? 0
  const totalReps = input.totalReps ?? 0
  const averageLoadKg = input.averageLoadKg ?? 0

  const volumeFactor =
    1 +
    clamp(totalSets / 90, 0, 0.2) +
    clamp(totalReps / 1400, 0, 0.16) +
    clamp(averageLoadKg / 600, 0, 0.12)

  const calories = Math.round((met * weightKg * durationMinutes) / 60 * volumeFactor)

  return {
    estimatedCalories: clamp(calories, 40, 1600),
    intensityLabel,
    confidence: inferConfidence(input),
  }
}
