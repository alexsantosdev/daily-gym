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
import type {
  CreateWorkoutInput,
  UpdateWorkoutInput,
  Workout,
  WorkoutExercise,
} from "@/types/workout"

const COLLECTION_NAME = "workouts"

function sanitizeExercise(exercise: Partial<WorkoutExercise>): WorkoutExercise {
  return {
    name: exercise.name ?? "",
    muscleGroup: exercise.muscleGroup ?? "",
    sets: Number(exercise.sets ?? 0),
    reps: Number(exercise.reps ?? 0),
    suggestedLoad: exercise.suggestedLoad,
    plannedRestSeconds: exercise.plannedRestSeconds
      ? Number(exercise.plannedRestSeconds)
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

  const payload: Omit<Workout, "id"> = {
    userId: input.userId,
    planId: input.planId,
    name: input.name,
    muscleGroup: input.muscleGroup,
    weekday: input.weekday,
    exercises: input.exercises,
    order: input.order ?? 0,
    createdAt: now,
    updatedAt: now,
  }

  const created = await addDoc(collection(db, COLLECTION_NAME), payload)
  return mapWorkout(created.id, payload)
}

export async function updateWorkout(workoutId: string, userId: string, input: UpdateWorkoutInput) {
  const { db } = assertFirebaseConfigured()
  await updateDoc(doc(db, COLLECTION_NAME, workoutId), {
    ...input,
    userId,
    updatedAt: new Date().toISOString(),
  })
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
