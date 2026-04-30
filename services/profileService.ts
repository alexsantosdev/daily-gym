import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore"

import { assertFirebaseConfigured } from "@/lib/firebase"
import type {
  CreateUserProfileInput,
  UpdateUserProfileInput,
  UserProfile,
} from "@/types/profile"

const COLLECTION_NAME = "profiles"

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefinedDeep(item)) as T
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, itemValue]) => itemValue !== undefined)
      .map(([key, itemValue]) => [key, stripUndefinedDeep(itemValue)])
    return Object.fromEntries(entries) as T
  }

  return value
}

function mapUserProfile(id: string, data: Partial<UserProfile>): UserProfile {
  return {
    id,
    userId: data.userId ?? id,
    displayName: data.displayName ?? "",
    gender: data.gender ?? "prefer_not_to_say",
    birthDate: data.birthDate ?? "",
    age: Number(data.age ?? 0),
    weightKg: Number(data.weightKg ?? 0),
    heightCm: Number(data.heightCm ?? 0),
    goal: data.goal ?? "health",
    experienceLevel: data.experienceLevel ?? "beginner",
    trainingFrequencyGoal: Number(data.trainingFrequencyGoal ?? 3),
    preferredWorkoutDays: data.preferredWorkoutDays ?? [],
    availableTimeMinutes: Number(data.availableTimeMinutes ?? 45),
    injuriesOrLimitations: data.injuriesOrLimitations,
    foodRestrictions: data.foodRestrictions,
    preferredDietStyle: data.preferredDietStyle,
    currentObjectiveDescription: data.currentObjectiveDescription,
    aiConsent: Boolean(data.aiConsent),
    onboardingCompleted: Boolean(data.onboardingCompleted),
    activityLevel: data.activityLevel ?? "moderate",
    sleepAverageHours:
      typeof data.sleepAverageHours === "number" ? Number(data.sleepAverageHours) : undefined,
    waterIntakeGoalMl:
      typeof data.waterIntakeGoalMl === "number" ? Number(data.waterIntakeGoalMl) : undefined,
    mealsPerDayGoal:
      typeof data.mealsPerDayGoal === "number" ? Number(data.mealsPerDayGoal) : undefined,
    targetWeightKg:
      typeof data.targetWeightKg === "number" ? Number(data.targetWeightKg) : undefined,
    notes: data.notes,
    stravaIntegration: data.stravaIntegration,
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { db } = assertFirebaseConfigured()
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, userId))

  if (!snapshot.exists()) {
    return null
  }

  return mapUserProfile(snapshot.id, snapshot.data() as Partial<UserProfile>)
}

export async function createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()
  const payload = stripUndefinedDeep<Omit<UserProfile, "id">>({
    userId: input.userId,
    displayName: input.displayName.trim(),
    gender: input.gender,
    birthDate: input.birthDate,
    age: input.age,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    goal: input.goal,
    experienceLevel: input.experienceLevel,
    trainingFrequencyGoal: input.trainingFrequencyGoal,
    preferredWorkoutDays: input.preferredWorkoutDays,
    availableTimeMinutes: input.availableTimeMinutes,
    injuriesOrLimitations: input.injuriesOrLimitations,
    foodRestrictions: input.foodRestrictions,
    preferredDietStyle: input.preferredDietStyle,
    currentObjectiveDescription: input.currentObjectiveDescription,
    aiConsent: input.aiConsent,
    onboardingCompleted: input.onboardingCompleted ?? false,
    activityLevel: input.activityLevel,
    sleepAverageHours: input.sleepAverageHours,
    waterIntakeGoalMl: input.waterIntakeGoalMl,
    mealsPerDayGoal: input.mealsPerDayGoal,
    targetWeightKg: input.targetWeightKg,
    notes: input.notes,
    stravaIntegration: input.stravaIntegration,
    createdAt: now,
    updatedAt: now,
  })

  await setDoc(doc(db, COLLECTION_NAME, input.userId), payload)
  return mapUserProfile(input.userId, payload)
}

export async function updateUserProfile(userId: string, input: UpdateUserProfileInput): Promise<void> {
  const { db } = assertFirebaseConfigured()
  await updateDoc(
    doc(db, COLLECTION_NAME, userId),
    stripUndefinedDeep({
      ...input,
      updatedAt: new Date().toISOString(),
    })
  )
}

export async function completeOnboarding(userId: string): Promise<void> {
  await updateUserProfile(userId, { onboardingCompleted: true })
}

export async function shouldShowOnboarding(userId: string): Promise<boolean> {
  const profile = await getUserProfile(userId)
  return !profile || profile.onboardingCompleted !== true
}
