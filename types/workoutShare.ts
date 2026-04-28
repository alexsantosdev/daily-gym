import type { StreakSummary } from "@/types/streak"
import type { Workout, WorkoutExecution, WorkoutPlan } from "@/types/workout"

export const workoutIntensityLabels = ["leve", "moderada", "alta", "muito_alta"] as const
export const workoutShareVisualMoods = ["intense_fuchsia", "neon_energy", "dark_premium", "clean_dark"] as const
export const workoutCaloriesConfidenceLevels = ["low", "medium", "high"] as const

export type WorkoutIntensityLabel = (typeof workoutIntensityLabels)[number]
export type WorkoutShareVisualMood = (typeof workoutShareVisualMoods)[number]
export type WorkoutCaloriesConfidence = (typeof workoutCaloriesConfidenceLevels)[number]

export interface WorkoutCaloriesEstimateInput {
  durationMinutes: number
  userWeightKg?: number
  workoutIntensity?: WorkoutIntensityLabel
  totalSets?: number
  totalReps?: number
  averageLoadKg?: number
  muscleGroup?: string
  workoutGoal?: string
}

export interface WorkoutCaloriesEstimateResult {
  estimatedCalories: number
  intensityLabel: WorkoutIntensityLabel
  confidence: WorkoutCaloriesConfidence
}

export interface WorkoutShareAIAnalysis {
  headline: string
  kicker: string
  subtitle: string
  motivationalPhrase: string
  performanceHighlight: string
  socialHook: string
  ctaText: string
  intensityLabel: WorkoutIntensityLabel
  estimatedCalories: number
  hashtags: string[]
  visualMood: WorkoutShareVisualMood
}

export interface WorkoutShareAnalysisPayload {
  workoutExecution: WorkoutExecution
  workout: Workout
  workoutPlan?: WorkoutPlan
  userProfile?: {
    displayName?: string
    weightKg?: number
    goal?: string
    experienceLevel?: string
    availableTimeMinutes?: number
  }
  streakSummary?: Pick<StreakSummary, "currentStreak" | "weeklyPercentage" | "todayStatus">
  recentHistory?: Array<Pick<WorkoutExecution, "id" | "date" | "durationMinutes" | "status">>
}

export interface WorkoutShareCardData {
  cardType: "workout" | "streak" | "competition" | "activity" | "monthly_recap"
  badgeLabel: string
  userName: string
  workoutName: string
  planName?: string
  goalLabel?: string
  date: string
  durationMinutes: number
  totalExercises: number
  completedExercises: number
  estimatedCalories: number
  intensityLabel: WorkoutIntensityLabel
  currentStreak?: number
  headline: string
  kicker: string
  subtitle: string
  motivationalPhrase: string
  performanceHighlight: string
  socialHook: string
  ctaText: string
  photoUrl?: string
  brandFooter: string
  visualMood: WorkoutShareVisualMood
}
