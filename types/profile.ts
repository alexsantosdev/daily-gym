import type { StravaIntegrationStatus } from "@/types/strava"

export const profileGenders = ["male", "female", "other", "prefer_not_to_say"] as const
export const profileGoals = [
  "hypertrophy",
  "fat_loss",
  "strength",
  "maintenance",
  "conditioning",
  "health",
  "other",
] as const
export const experienceLevels = ["beginner", "intermediate", "advanced"] as const
export const activityLevels = ["sedentary", "light", "moderate", "active", "very_active"] as const
export const checkinMoods = ["low", "neutral", "good", "great"] as const

export type ProfileGender = (typeof profileGenders)[number]
export type ProfileGoal = (typeof profileGoals)[number]
export type ExperienceLevel = (typeof experienceLevels)[number]
export type ActivityLevel = (typeof activityLevels)[number]
export type MonthlyCheckinMood = (typeof checkinMoods)[number]
export type RatingScale = 1 | 2 | 3 | 4 | 5

export interface UserProfile {
  id: string
  userId: string
  displayName: string
  gender: ProfileGender
  birthDate: string
  age: number
  weightKg: number
  heightCm: number
  goal: ProfileGoal
  experienceLevel: ExperienceLevel
  trainingFrequencyGoal: number
  preferredWorkoutDays: number[]
  availableTimeMinutes: number
  injuriesOrLimitations?: string
  foodRestrictions?: string
  preferredDietStyle?: string
  currentObjectiveDescription?: string
  aiConsent: boolean
  onboardingCompleted: boolean
  activityLevel: ActivityLevel
  sleepAverageHours?: number
  waterIntakeGoalMl?: number
  mealsPerDayGoal?: number
  targetWeightKg?: number
  notes?: string
  stravaIntegration?: StravaIntegrationStatus
  createdAt: string
  updatedAt: string
}

export interface CreateUserProfileInput {
  userId: string
  displayName: string
  gender: ProfileGender
  birthDate: string
  age: number
  weightKg: number
  heightCm: number
  goal: ProfileGoal
  experienceLevel: ExperienceLevel
  trainingFrequencyGoal: number
  preferredWorkoutDays: number[]
  availableTimeMinutes: number
  injuriesOrLimitations?: string
  foodRestrictions?: string
  preferredDietStyle?: string
  currentObjectiveDescription?: string
  aiConsent: boolean
  onboardingCompleted?: boolean
  activityLevel: ActivityLevel
  sleepAverageHours?: number
  waterIntakeGoalMl?: number
  mealsPerDayGoal?: number
  targetWeightKg?: number
  notes?: string
  stravaIntegration?: StravaIntegrationStatus
}

export interface UpdateUserProfileInput {
  displayName?: string
  gender?: ProfileGender
  birthDate?: string
  age?: number
  weightKg?: number
  heightCm?: number
  goal?: ProfileGoal
  experienceLevel?: ExperienceLevel
  trainingFrequencyGoal?: number
  preferredWorkoutDays?: number[]
  availableTimeMinutes?: number
  injuriesOrLimitations?: string
  foodRestrictions?: string
  preferredDietStyle?: string
  currentObjectiveDescription?: string
  aiConsent?: boolean
  onboardingCompleted?: boolean
  activityLevel?: ActivityLevel
  sleepAverageHours?: number
  waterIntakeGoalMl?: number
  mealsPerDayGoal?: number
  targetWeightKg?: number
  notes?: string
  stravaIntegration?: StravaIntegrationStatus
}

export interface UserMonthlyCheckin {
  id: string
  userId: string
  month: number
  year: number
  weightKg: number
  waistCm?: number
  chestCm?: number
  hipCm?: number
  armCm?: number
  thighCm?: number
  bodyFatPercentage?: number
  progressPhotoUrl?: string
  mood?: MonthlyCheckinMood
  energyLevel?: RatingScale
  sleepQuality?: RatingScale
  adherenceNote?: string
  objectiveUpdate?: string
  createdAt: string
  updatedAt: string
}

export interface CreateMonthlyCheckinInput {
  userId: string
  month: number
  year: number
  weightKg: number
  waistCm?: number
  chestCm?: number
  hipCm?: number
  armCm?: number
  thighCm?: number
  bodyFatPercentage?: number
  progressPhotoUrl?: string
  mood?: MonthlyCheckinMood
  energyLevel?: RatingScale
  sleepQuality?: RatingScale
  adherenceNote?: string
  objectiveUpdate?: string
}

export interface UpdateMonthlyCheckinInput {
  weightKg?: number
  waistCm?: number
  chestCm?: number
  hipCm?: number
  armCm?: number
  thighCm?: number
  bodyFatPercentage?: number
  progressPhotoUrl?: string
  mood?: MonthlyCheckinMood
  energyLevel?: RatingScale
  sleepQuality?: RatingScale
  adherenceNote?: string
  objectiveUpdate?: string
}
