import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore"

import { getDateRangeFromPreset } from "@/lib/date"
import { assertFirebaseConfigured } from "@/lib/firebase"
import { listMealsByUser } from "@/services/mealService"
import { getMonthlyCheckins } from "@/services/monthlyCheckinService"
import { getUserProfile } from "@/services/profileService"
import { getStreakSummary } from "@/services/streakService"
import { createWorkoutPlan, updateWorkoutPlan } from "@/services/workoutPlanService"
import { createWorkout, listWorkoutsByUser } from "@/services/workoutService"
import { getActivitiesByUser } from "@/services/activityService"
import { listWorkoutExecutionsByUser } from "@/services/workoutExecutionService"
import { listWorkoutPlansByUser } from "@/services/workoutPlanService"
import type {
  AIRecommendation,
  AIRecommendationType,
  AIWorkoutPlanPayload,
  CreateAIRecommendationInput,
  PersonalAIRequestPayload,
  PersonalAIResponse,
  RequestAIRecommendationInput,
  UserAIContext,
} from "@/types/ai"

const COLLECTION_NAME = "aiRecommendations"

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

function mapAIRecommendation(id: string, data: Partial<AIRecommendation>): AIRecommendation {
  return {
    id,
    userId: data.userId ?? "",
    type: data.type ?? "progress_analysis",
    title: data.title ?? "Recomendacao IA",
    summary: data.summary ?? "",
    payload: data.payload ?? {},
    status: data.status ?? "draft",
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

function normalizeWorkoutPlanGoal(goal: string): "hypertrophy" | "weight_loss" | "strength" | "maintenance" | "conditioning" | "other" {
  if (goal === "fat_loss") {
    return "weight_loss"
  }

  if (goal === "health") {
    return "maintenance"
  }

  if (
    goal === "hypertrophy" ||
    goal === "weight_loss" ||
    goal === "strength" ||
    goal === "maintenance" ||
    goal === "conditioning"
  ) {
    return goal
  }

  return "other"
}

function isValidWorkoutPlanPayload(payload: unknown): payload is AIWorkoutPlanPayload {
  if (!payload || typeof payload !== "object") {
    return false
  }

  const candidate = payload as Record<string, unknown>
  const plan = candidate.plan as Record<string, unknown>
  const workouts = candidate.workouts

  return (
    !!plan &&
    typeof plan.name === "string" &&
    typeof plan.goal === "string" &&
    Array.isArray(plan.weekdays) &&
    Array.isArray(workouts)
  )
}

export async function buildUserAIContext(userId: string): Promise<UserAIContext> {
  const [profile, checkins, plans, workouts, executions, meals, activities] = await Promise.all([
    getUserProfile(userId),
    getMonthlyCheckins(userId),
    listWorkoutPlansByUser(userId),
    listWorkoutsByUser(userId),
    listWorkoutExecutionsByUser(userId),
    listMealsByUser(userId),
    getActivitiesByUser(userId),
  ])

  const range = getDateRangeFromPreset("30d")
  const inLast30Days = (date: string) => date >= range.periodStart && date <= range.periodEnd

  const workoutsExecutedLast30d = executions.filter(
    (execution) => execution.status === "executed" && inLast30Days(execution.date)
  ).length
  const workoutsPartialLast30d = executions.filter(
    (execution) => execution.status === "partial" && inLast30Days(execution.date)
  ).length
  const activitiesLast30d = activities.filter((activity) => inLast30Days(activity.date)).length
  const mealsLast30d = meals.filter((meal) => inLast30Days(meal.date)).length

  const streakSummary = getStreakSummary(plans, workouts, executions, activities)
  const activePlan = plans.find((plan) => plan.status === "active") ?? null

  return {
    userId,
    profile: profile
      ? {
          displayName: profile.displayName,
          goal: profile.goal,
          experienceLevel: profile.experienceLevel,
          trainingFrequencyGoal: profile.trainingFrequencyGoal,
          availableTimeMinutes: profile.availableTimeMinutes,
          injuriesOrLimitations: profile.injuriesOrLimitations,
          foodRestrictions: profile.foodRestrictions,
          aiConsent: profile.aiConsent,
        }
      : null,
    monthlyCheckins: checkins.slice(0, 6).map((checkin) => ({
      month: checkin.month,
      year: checkin.year,
      weightKg: checkin.weightKg,
      bodyFatPercentage: checkin.bodyFatPercentage,
      adherenceNote: checkin.adherenceNote,
      objectiveUpdate: checkin.objectiveUpdate,
    })),
    stats: {
      workoutsExecutedLast30d,
      workoutsPartialLast30d,
      activitiesLast30d,
      mealsLast30d,
      currentStreak: streakSummary.currentStreak,
      weeklyCompletion: `${streakSummary.weeklyCompleted}/${streakSummary.weeklyPlanned}`,
    },
    activePlan: activePlan
      ? {
          id: activePlan.id,
          name: activePlan.name,
          goal: activePlan.goal,
          weekdays: activePlan.weekdays,
        }
      : null,
  }
}

export async function requestAIRecommendation(
  input: RequestAIRecommendationInput
): Promise<PersonalAIResponse> {
  const context = await buildUserAIContext(input.userId)

  if (context.profile && !context.profile.aiConsent) {
    throw new Error("Consentimento de IA desativado no perfil.")
  }

  const payload: PersonalAIRequestPayload = {
    type: input.type,
    context,
    prompt: input.prompt,
  }

  const response = await fetch("/api/personal-ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(errorPayload.error || "Falha ao gerar recomendacao da IA.")
  }

  return (await response.json()) as PersonalAIResponse
}

export async function saveAIRecommendation(
  input: CreateAIRecommendationInput
): Promise<AIRecommendation> {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()

  const payload = stripUndefinedDeep<Omit<AIRecommendation, "id">>({
    userId: input.userId,
    type: input.type,
    title: input.title,
    summary: input.summary,
    payload: input.payload,
    status: input.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  })

  const created = await addDoc(collection(db, COLLECTION_NAME), payload)
  return mapAIRecommendation(created.id, payload)
}

export async function listAIRecommendationsByUser(userId: string): Promise<AIRecommendation[]> {
  const { db } = assertFirebaseConfigured()
  const recommendationsQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )

  const snapshot = await getDocs(recommendationsQuery)
  return snapshot.docs.map((recommendationDoc) =>
    mapAIRecommendation(recommendationDoc.id, recommendationDoc.data() as Partial<AIRecommendation>)
  )
}

async function setRecommendationStatus(recommendationId: string, status: AIRecommendation["status"]) {
  const { db } = assertFirebaseConfigured()
  await updateDoc(doc(db, COLLECTION_NAME, recommendationId), {
    status,
    updatedAt: new Date().toISOString(),
  })
}

export async function rejectRecommendation(recommendationId: string): Promise<void> {
  await setRecommendationStatus(recommendationId, "rejected")
}

export async function acceptRecommendation(recommendationId: string): Promise<void> {
  await setRecommendationStatus(recommendationId, "accepted")
}

async function getRecommendationById(recommendationId: string): Promise<AIRecommendation> {
  const { db } = assertFirebaseConfigured()
  const snapshot = await getDoc(doc(db, COLLECTION_NAME, recommendationId))

  if (!snapshot.exists()) {
    throw new Error("Recomendacao nao encontrada.")
  }

  return mapAIRecommendation(snapshot.id, snapshot.data() as Partial<AIRecommendation>)
}

function toSetsAndReps(repsValue: string) {
  const parsed = repsValue.match(/\d+/)
  const parsedReps = parsed ? Number(parsed[0]) : 10

  return {
    reps: Number.isFinite(parsedReps) ? parsedReps : 10,
  }
}

export async function applyWorkoutPlanRecommendation(recommendationId: string): Promise<void> {
  const recommendation = await getRecommendationById(recommendationId)

  if (recommendation.type !== "workout_plan") {
    throw new Error("A recomendacao selecionada nao e um plano de treino.")
  }

  if (!isValidWorkoutPlanPayload(recommendation.payload)) {
    throw new Error("Payload de plano de treino invalido.")
  }

  const payload = recommendation.payload
  const createdPlan = await createWorkoutPlan({
    userId: recommendation.userId,
    name: payload.plan.name,
    goal: normalizeWorkoutPlanGoal(payload.plan.goal),
    description: payload.plan.description,
    weekdays: payload.plan.weekdays,
    status: payload.plan.status,
  })

  const createdWorkouts = await Promise.all(
    payload.workouts.map((workout, index) =>
      createWorkout({
        userId: recommendation.userId,
        planId: createdPlan.id,
        name: workout.name,
        muscleGroup: workout.muscleGroup,
        weekday: workout.weekday,
        order: index,
        exercises: workout.exercises.map((exercise) => {
          const { reps } = toSetsAndReps(exercise.reps)
          return {
            name: exercise.name,
            muscleGroup: exercise.muscleGroup,
            sets: exercise.sets,
            reps,
            suggestedLoad: exercise.suggestedLoad,
            plannedRestSeconds: exercise.restSeconds,
            notes: exercise.notes,
          }
        }),
      })
    )
  )

  await updateWorkoutPlan(createdPlan.id, recommendation.userId, {
    workoutIds: createdWorkouts.map((workout) => workout.id),
  })

  await setRecommendationStatus(recommendationId, "applied")
}

export async function getRecommendationByType(
  userId: string,
  type: AIRecommendationType
): Promise<AIRecommendation | null> {
  const recommendations = await listAIRecommendationsByUser(userId)
  return recommendations.find((recommendation) => recommendation.type === type) ?? null
}
