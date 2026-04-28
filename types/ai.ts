import type { ProfileGoal } from "@/types/profile"

export const aiRecommendationTypes = [
  "workout_plan",
  "workout_adjustment",
  "activity_suggestion",
  "nutrition_suggestion",
  "progress_analysis",
] as const

export const aiRecommendationStatuses = ["draft", "accepted", "rejected", "applied"] as const

export type AIRecommendationType = (typeof aiRecommendationTypes)[number]
export type AIRecommendationStatus = (typeof aiRecommendationStatuses)[number]

export interface AIShareableMetric {
  label: string
  value: string | number
}

export interface AIWorkoutPlanExercisePayload {
  name: string
  muscleGroup: string
  sets: number
  reps: string
  suggestedLoad?: string
  restSeconds?: number
  notes?: string
}

export interface AIWorkoutPlanWorkoutPayload {
  name: string
  muscleGroup: string
  weekday: number
  exercises: AIWorkoutPlanExercisePayload[]
}

export interface AIWorkoutPlanPayload {
  plan: {
    name: string
    goal: ProfileGoal
    description: string
    weekdays: number[]
    status: "active" | "inactive"
  }
  workouts: AIWorkoutPlanWorkoutPayload[]
}

export interface AINutritionSuggestionPayload {
  summary: string
  attentionPoints: string[]
  suggestions: string[]
  mealIdeas: string[]
  consistencyTips: string[]
}

export interface AIRecommendation {
  id: string
  userId: string
  type: AIRecommendationType
  title: string
  summary: string
  payload: Record<string, unknown>
  status: AIRecommendationStatus
  createdAt: string
  updatedAt: string
}

export interface CreateAIRecommendationInput {
  userId: string
  type: AIRecommendationType
  title: string
  summary: string
  payload: Record<string, unknown>
  status?: AIRecommendationStatus
}

export interface UserAIContext {
  userId: string
  profile: {
    displayName: string
    goal: ProfileGoal
    experienceLevel: string
    trainingFrequencyGoal: number
    availableTimeMinutes: number
    injuriesOrLimitations?: string
    foodRestrictions?: string
    aiConsent: boolean
  } | null
  monthlyCheckins: Array<{
    month: number
    year: number
    weightKg: number
    bodyFatPercentage?: number
    adherenceNote?: string
    objectiveUpdate?: string
  }>
  stats: {
    workoutsExecutedLast30d: number
    workoutsPartialLast30d: number
    activitiesLast30d: number
    mealsLast30d: number
    currentStreak: number
    weeklyCompletion: string
  }
  activePlan: {
    id: string
    name: string
    goal: string
    weekdays: number[]
  } | null
}

export interface RequestAIRecommendationInput {
  userId: string
  type: AIRecommendationType
  prompt?: string
}

export interface PersonalAIRequestPayload {
  type: AIRecommendationType
  context: UserAIContext
  prompt?: string
}

export interface PersonalAIResponse {
  recommendation: Omit<AIRecommendation, "id" | "userId" | "status" | "createdAt" | "updatedAt">
  source: "mock" | "openai"
}
