import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore"

import { assertFirebaseConfigured } from "@/lib/firebase"
import { normalizeRepsValue } from "@/lib/reps"
import type {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  Workout,
  WorkoutExercise,
} from "@/types/workout"

const COLLECTION_NAME = "workouts"

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

function sanitizeExercise(exercise: Partial<WorkoutExercise>): WorkoutExercise {
  const toSafeNumber = (value: unknown, fallback = 0) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : fallback
    }

    if (typeof value === "string") {
      const normalized = value.replace(",", ".").trim()
      const direct = Number(normalized)
      if (Number.isFinite(direct)) {
        return direct
      }

      // Support ranges/annotations such as "8-10", "10 a 12" and "90s".
      const matched = normalized.match(/\d+(\.\d+)?/)
      if (matched) {
        const parsed = Number(matched[0])
        if (Number.isFinite(parsed)) {
          return parsed
        }
      }
    }

    return fallback
  }

  return {
    name: exercise.name ?? "",
    muscleGroup: exercise.muscleGroup ?? "",
    sets: toSafeNumber(exercise.sets, 0),
    reps: normalizeRepsValue(exercise.reps, "0"),
    suggestedLoad: exercise.suggestedLoad,
    plannedRestSeconds: exercise.plannedRestSeconds
      ? toSafeNumber(exercise.plannedRestSeconds)
      : undefined,
    notes: exercise.notes,
  }
}

function mapWorkout(id: string, data: Partial<Workout>): Workout {
  return {
    id,
    userId: data.userId ?? "",
    planId: data.planId ?? "",
    name: data.name ?? "",
    muscleGroup: data.muscleGroup ?? "",
    weekday: typeof data.weekday === "number" ? Number(data.weekday) : undefined,
    exercises: (data.exercises ?? []).map((exercise) => sanitizeExercise(exercise)),
    order: Number(data.order ?? 0),
    createdAt: data.createdAt ?? new Date().toISOString(),
    updatedAt: data.updatedAt ?? new Date().toISOString(),
  }
}

export async function createWorkout(input: CreateWorkoutInput) {
  const { db } = assertFirebaseConfigured()
  const now = new Date().toISOString()
  const exercises = input.exercises.map((exercise) => sanitizeExercise(exercise))

  const payload = stripUndefinedDeep<Omit<Workout, "id">>({
    userId: input.userId,
    planId: input.planId,
    name: input.name,
    muscleGroup: input.muscleGroup,
    weekday: input.weekday,
    exercises,
    order: input.order ?? 0,
    createdAt: now,
    updatedAt: now,
  })

  const created = await addDoc(collection(db, COLLECTION_NAME), payload)
  return mapWorkout(created.id, payload)
}

export async function updateWorkout(workoutId: string, userId: string, input: UpdateWorkoutInput) {
  const { db } = assertFirebaseConfigured()
  const payload = stripUndefinedDeep({
    ...input,
    exercises: input.exercises?.map((exercise) => sanitizeExercise(exercise)),
    userId,
    updatedAt: new Date().toISOString(),
  })
  await updateDoc(doc(db, COLLECTION_NAME, workoutId), payload)
}

export async function deleteWorkout(workoutId: string) {
  const { db } = assertFirebaseConfigured()
  await deleteDoc(doc(db, COLLECTION_NAME, workoutId))
}

export async function listWorkoutsByUser(userId: string) {
  const { db } = assertFirebaseConfigured()
  const workoutsQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  )

  const snapshot = await getDocs(workoutsQuery)
  return snapshot.docs.map((workoutDoc) =>
    mapWorkout(workoutDoc.id, workoutDoc.data() as Partial<Workout>)
  )
}

export async function listWorkoutsByPlan(userId: string, planId: string) {
  const { db } = assertFirebaseConfigured()
  const workoutsQuery = query(
    collection(db, COLLECTION_NAME),
    where("userId", "==", userId),
    where("planId", "==", planId),
    orderBy("order", "asc")
  )

  const snapshot = await getDocs(workoutsQuery)
  return snapshot.docs.map((workoutDoc) =>
    mapWorkout(workoutDoc.id, workoutDoc.data() as Partial<Workout>)
  )
}
